declare module 'ws' {
  export = WebSocket;
  class WebSocket {
    constructor(url: string, protocols?: string | string[]);
    send(data: any): void;
    close(): void;
    on(event: string, listener: (...args: any[]) => void): void;
    once(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    addEventListener(event: string, listener: EventListener): void;
    removeEventListener(event: string, listener: EventListener): void;
    readyState: number;
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;
  }
}
