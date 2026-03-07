// OpenClaw Gateway WebSocket Client

import { EventEmitter } from 'events';
import * as nodeCrypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import WebSocket from 'ws';
import type { OpenClawMessage, OpenClawSessionInfo } from '../types';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Device identity file for persistent Ed25519 keypair
const DEVICE_IDENTITY_PATH = path.join(
  process.env.HOME || '/tmp',
  '.mission-control-device-identity.json'
);

interface DeviceIdentity {
  deviceId: string;
  publicKeyRaw: string; // base64url-encoded raw 32-byte public key
  privateKeyPem: string;
  publicKeyPem: string;
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = nodeCrypto.createPublicKey(publicKeyPem);
  const spkiDer = key.export({ type: 'spki', format: 'der' });
  // Ed25519 SPKI DER has a 12-byte prefix, raw key is last 32 bytes
  return spkiDer.subarray(spkiDer.length - 32);
}

function getOrCreateDeviceIdentity(): DeviceIdentity {
  // Try to load existing identity
  try {
    if (fs.existsSync(DEVICE_IDENTITY_PATH)) {
      const data = JSON.parse(fs.readFileSync(DEVICE_IDENTITY_PATH, 'utf8'));
      if (data.deviceId && data.publicKeyRaw && data.privateKeyPem && data.publicKeyPem) {
        return data as DeviceIdentity;
      }
    }
  } catch {
    // Will regenerate
  }

  // Generate new Ed25519 keypair
  const { publicKey, privateKey } = nodeCrypto.generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const rawPub = derivePublicKeyRaw(publicKeyPem);
  const publicKeyRaw = base64UrlEncode(rawPub);
  const deviceId = nodeCrypto.createHash('sha256').update(rawPub).digest('hex');

  const identity: DeviceIdentity = { deviceId, publicKeyRaw, privateKeyPem, publicKeyPem };

  try {
    fs.writeFileSync(DEVICE_IDENTITY_PATH, JSON.stringify(identity, null, 2), { mode: 0o600 });
  } catch (err) {
    console.error('[OpenClaw] Failed to save device identity:', err);
  }

  return identity;
}

function signPayload(privateKeyPem: string, payload: string): string {
  const key = nodeCrypto.createPrivateKey(privateKeyPem);
  const sig = nodeCrypto.sign(null, Buffer.from(payload, 'utf8'), key);
  return base64UrlEncode(sig);
}

function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string | null;
  nonce: string;
}): string {
  return [
    'v2',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
    params.nonce,
  ].join('|');
}

export class OpenClawClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string | number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private connected = false;
  private authenticated = false;
  private connecting: Promise<void> | null = null;
  private autoReconnect = true;
  private token: string;
  private deviceIdentity: DeviceIdentity;

  constructor(private url: string = GATEWAY_URL, token: string = GATEWAY_TOKEN) {
    super();
    this.token = token;
    this.deviceIdentity = getOrCreateDeviceIdentity();
    console.log('[OpenClaw] Device ID:', this.deviceIdentity.deviceId.slice(0, 12) + '...');
    this.on('error', () => {});
  }

  async connect(): Promise<void> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = new Promise((resolve, reject) => {
      try {
        if (this.ws) {
          this.ws.onclose = null;
          this.ws.onerror = null;
          this.ws.onmessage = null;
          this.ws.onopen = null;
          if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
          }
          this.ws = null;
        }

        const wsUrl = new URL(this.url);
        if (this.token) {
          wsUrl.searchParams.set('token', this.token);
        }
        console.log('[OpenClaw] Connecting to:', wsUrl.toString().replace(/token=[^&]+/, 'token=***'));
        this.ws = new WebSocket(wsUrl.toString());

        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = async () => {
          clearTimeout(connectionTimeout);
          console.log('[OpenClaw] WebSocket opened, waiting for challenge...');
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          const wasConnected = this.connected;
          this.connected = false;
          this.authenticated = false;
          this.connecting = null;
          this.emit('disconnected');
          console.log(`[OpenClaw] Disconnected from Gateway (code: ${event.code}, reason: "${event.reason}", wasClean: ${event.wasClean})`);
          if (this.autoReconnect && wasConnected) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('[OpenClaw] WebSocket error');
          this.emit('error', error);
          if (!this.connected) {
            this.connecting = null;
            reject(new Error('Failed to connect to OpenClaw Gateway'));
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);

            if (data.type === 'event' && data.event === 'connect.challenge') {
              console.log('[OpenClaw] Challenge received, building device-signed response...');
              const nonce = data.payload?.nonce;
              if (!nonce) {
                this.connecting = null;
                reject(new Error('Challenge missing nonce'));
                return;
              }

              const requestId = nodeCrypto.randomUUID();
              const role = 'operator';
              const scopes = ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals', 'operator.pairing'];
              const clientId = 'gateway-client';
              const clientMode = 'backend';
              const signedAtMs = Date.now();

              // Build and sign the device auth payload
              const payload = buildDeviceAuthPayload({
                deviceId: this.deviceIdentity.deviceId,
                clientId,
                clientMode,
                role,
                scopes,
                signedAtMs,
                token: this.token || '',
                nonce,
              });
              const signature = signPayload(this.deviceIdentity.privateKeyPem, payload);

              const response = {
                type: 'req',
                id: requestId,
                method: 'connect',
                params: {
                  minProtocol: 3,
                  maxProtocol: 3,
                  client: {
                    id: clientId,
                    version: '1.0.0',
                    platform: 'web',
                    mode: clientMode,
                  },
                  auth: {
                    token: this.token || '',
                  },
                  role,
                  scopes,
                  device: {
                    id: this.deviceIdentity.deviceId,
                    publicKey: this.deviceIdentity.publicKeyRaw,
                    signature,
                    signedAt: signedAtMs,
                    nonce,
                  },
                },
              };

              this.pendingRequests.set(requestId, {
                resolve: (payload: unknown) => {
                  this.connected = true;
                  this.authenticated = true;
                  this.connecting = null;
                  this.emit('connected');
                  
                  // Store device token if returned
                  const authInfo = (payload as { auth?: { deviceToken?: string } })?.auth;
                  if (authInfo?.deviceToken) {
                    console.log('[OpenClaw] Received device token from gateway');
                  }
                  
                  console.log('[OpenClaw] Authenticated successfully with device identity');
                  resolve();
                },
                reject: (error: Error) => {
                  this.connecting = null;
                  this.ws?.close();
                  reject(new Error(`Authentication failed: ${error.message}`));
                },
              });

              console.log('[OpenClaw] Sending device-signed challenge response');
              this.ws!.send(JSON.stringify(response));
              return;
            }

            this.handleMessage(data as OpenClawMessage);
          } catch (err) {
            console.error('[OpenClaw] Failed to parse message:', err);
          }
        };
      } catch (err) {
        this.connecting = null;
        reject(err);
      }
    });

    return this.connecting;
  }

  private handleMessage(data: OpenClawMessage & { type?: string; ok?: boolean; payload?: unknown }): void {
    if (data.type === 'res' && data.id !== undefined) {
      const requestId = data.id as string | number;
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        const { resolve, reject } = pending;
        this.pendingRequests.delete(requestId);

        if (data.ok === false && data.error) {
          reject(new Error(data.error.message));
        } else {
          resolve(data.payload);
        }
        return;
      }
    }

    const legacyId = data.id as string | number | undefined;
    if (legacyId !== undefined && this.pendingRequests.has(legacyId)) {
      const { resolve, reject } = this.pendingRequests.get(legacyId)!;
      this.pendingRequests.delete(legacyId);

      if (data.error) {
        reject(new Error(data.error.message));
      } else {
        resolve(data.result);
      }
      return;
    }

    if (data.method) {
      this.emit('notification', data);
      this.emit(data.method, data.params);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.autoReconnect) return;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.autoReconnect) return;

      console.log('[OpenClaw] Attempting reconnect...');
      try {
        await this.connect();
      } catch {
        this.scheduleReconnect();
      }
    }, 10000);
  }

  async call<T = unknown>(method: string, params?: Record<string, unknown>, timeoutMs = 30000): Promise<T> {
    if (!this.ws || !this.connected || !this.authenticated) {
      throw new Error('Not connected to OpenClaw Gateway');
    }

    const id = nodeCrypto.randomUUID();
    const message = { type: 'req', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });

      const timeoutHandle = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          const elapsed = Date.now();
          console.error(`[OpenClaw] [${new Date().toISOString()}] Request timeout after ${timeoutMs}ms: ${method}`);
          reject(new Error(`Request timeout after ${timeoutMs}ms: ${method}`));
        }
      }, timeoutMs);

      try {
        console.log(`[OpenClaw] [${new Date().toISOString()}] Sending ${method} (timeout: ${timeoutMs}ms)`);
        this.ws!.send(JSON.stringify(message));
      } catch (err) {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(id);
        console.error(`[OpenClaw] Failed to send ${method}:`, err);
        reject(err);
      }
    });
  }

  async listSessions(): Promise<OpenClawSessionInfo[]> {
    return this.call<OpenClawSessionInfo[]>('sessions.list');
  }

  async getSessionHistory(sessionId: string): Promise<unknown[]> {
    return this.call<unknown[]>('sessions.history', { session_id: sessionId });
  }

  async sendMessage(sessionId: string, content: string): Promise<void> {
    await this.call('sessions.send', { session_id: sessionId, content });
  }

  async createSession(channel: string, peer?: string): Promise<OpenClawSessionInfo> {
    return this.call<OpenClawSessionInfo>('sessions.create', { channel, peer });
  }

  async listNodes(): Promise<unknown[]> {
    return this.call<unknown[]>('node.list');
  }

  async describeNode(nodeId: string): Promise<unknown> {
    return this.call('node.describe', { node_id: nodeId });
  }

  disconnect(): void {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
    this.connecting = null;
  }

  isConnected(): boolean {
    return this.connected && this.authenticated && this.ws?.readyState === WebSocket.OPEN;
  }

  setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled;
    if (!enabled && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton instance for server-side usage
let clientInstance: OpenClawClient | null = null;

export function getOpenClawClient(): OpenClawClient {
  if (!clientInstance) {
    clientInstance = new OpenClawClient();
  }
  return clientInstance;
}
