declare module 'ws' {
  export = WebSocket;
  class WebSocket {
    constructor(url: string, protocols?: string | string[]);
    send(data: any): void;
    close(): void;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    addEventListener(event: string, listener: EventListener): void;
    removeEventListener(event: string, listener: EventListener): void;
    readyState: number;
    onopen: ((this: WebSocket, ev: Event) => any) | null;
    onclose: ((this: WebSocket, ev: CloseEvent) => any) | null;
    onerror: ((this: WebSocket, ev: Event) => any) | null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null;
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;
  }
  interface CloseEvent extends Event {
    code?: number;
    reason?: string;
    wasClean?: boolean;
  }
  interface MessageEvent extends Event {
    data: any;
  }
}
