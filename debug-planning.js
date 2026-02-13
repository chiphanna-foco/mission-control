#!/usr/bin/env node
/**
 * Debug script for Mission Control planning flow
 * Tests the OpenClaw Gateway connection and message flow
 */

const WebSocket = require('ws');
const crypto = require('crypto');

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'a3ef06ce71c5910a95b0bb0cfafc41e5ed8e2ec70d22aa37';

class OpenClawDebugger {
  constructor() {
    this.ws = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = new URL(GATEWAY_URL);
      wsUrl.searchParams.set('token', GATEWAY_TOKEN);
      
      console.log('[Debug] Connecting to:', wsUrl.toString().replace(/token=[^&]+/, 'token=***'));
      
      this.ws = new WebSocket(wsUrl.toString());
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);
      
      this.ws.onopen = () => {
        console.log('[Debug] WebSocket opened');
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[Debug] Received:', JSON.stringify(data, null, 2));
        
        // Handle challenge
        if (data.type === 'event' && data.event === 'connect.challenge') {
          const requestId = crypto.randomUUID();
          const response = {
            type: 'req',
            id: requestId,
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'debugger', version: '1.0.0', platform: 'node', mode: 'debug' },
              auth: { token: GATEWAY_TOKEN }
            }
          };
          
          this.pendingRequests.set(requestId, {
            resolve: () => {
              this.connected = true;
              clearTimeout(timeout);
              console.log('[Debug] Authenticated successfully');
              resolve();
            },
            reject
          });
          
          this.ws.send(JSON.stringify(response));
          return;
        }
        
        // Handle response
        if (data.type === 'res' && data.id !== undefined) {
          const pending = this.pendingRequests.get(data.id);
          if (pending) {
            this.pendingRequests.delete(data.id);
            if (data.ok === false) {
              pending.reject(new Error(data.error?.message || 'Unknown error'));
            } else {
              pending.resolve(data.payload);
            }
          }
        }
      };
      
      this.ws.onerror = (err) => {
        console.error('[Debug] WebSocket error:', err.message);
        reject(err);
      };
      
      this.ws.onclose = (event) => {
        console.log(`[Debug] Disconnected (code: ${event.code})`);
        this.connected = false;
      };
    });
  }
  
  async call(method, params) {
    if (!this.connected) throw new Error('Not connected');
    
    const id = crypto.randomUUID();
    const message = { type: 'req', id, method, params };
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
      
      this.ws.send(JSON.stringify(message));
    });
  }
  
  async listSessions() {
    console.log('\n[Debug] Listing sessions...');
    try {
      const sessions = await this.call('sessions.list');
      console.log('[Debug] Active sessions:', sessions.length);
      for (const session of sessions) {
        console.log(`  - ${session.id}: ${session.channel} (${session.status})`);
      }
      return sessions;
    } catch (err) {
      console.error('[Debug] Failed to list sessions:', err.message);
      return [];
    }
  }
  
  async testChatHistory(sessionKey) {
    console.log(`\n[Debug] Testing chat.history for session: ${sessionKey}`);
    try {
      const result = await this.call('chat.history', { sessionKey, limit: 20 });
      console.log('[Debug] Messages found:', result.messages?.length || 0);
      
      if (result.messages?.length > 0) {
        result.messages.forEach((msg, i) => {
          const preview = typeof msg.content === 'string' 
            ? msg.content.substring(0, 100) 
            : JSON.stringify(msg.content).substring(0, 100);
          console.log(`  [${i}] ${msg.role}: ${preview}...`);
        });
      }
      
      return result.messages || [];
    } catch (err) {
      console.error('[Debug] Failed to get history:', err.message);
      return [];
    }
  }
  
  async testChatSend(sessionKey, message) {
    console.log(`\n[Debug] Testing chat.send to session: ${sessionKey}`);
    try {
      await this.call('chat.send', { 
        sessionKey, 
        message,
        idempotencyKey: `debug-${Date.now()}`
      });
      console.log('[Debug] Message sent successfully');
    } catch (err) {
      console.error('[Debug] Failed to send message:', err.message);
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function main() {
  const debugger_ = new OpenClawDebugger();
  
  try {
    await debugger_.connect();
    
    // List all sessions
    await debugger_.listSessions();
    
    // Test with a planning session
    const testTaskId = 'test-' + Date.now();
    const sessionKey = `agent:main:planning:${testTaskId}`;
    
    // Check if session exists and has messages
    await debugger_.testChatHistory(sessionKey);
    
    // Test sending a message
    await debugger_.testChatSend(sessionKey, 'TEST: Hello from Mission Control debugger');
    
    // Wait and check history again
    console.log('\n[Debug] Waiting 3 seconds for response...');
    await new Promise(r => setTimeout(r, 3000));
    
    await debugger_.testChatHistory(sessionKey);
    
  } catch (err) {
    console.error('\n[Debug] Error:', err.message);
  } finally {
    debugger_.disconnect();
  }
}

main();
