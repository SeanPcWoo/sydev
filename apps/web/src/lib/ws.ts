type MessageHandler = (data: unknown) => void;

interface WsClient {
  on(type: string, handler: MessageHandler): void;
  off(type: string, handler: MessageHandler): void;
  close(): void;
}

export function createWsClient(): WsClient {
  const handlers = new Map<string, Set<MessageHandler>>();
  let ws: WebSocket | null = null;
  let retries = 0;
  const maxRetries = 5;
  const retryDelay = 3000;
  let closed = false;

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      retries = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string; data: unknown };
        const typeHandlers = handlers.get(msg.type);
        if (typeHandlers) {
          for (const handler of typeHandlers) {
            handler(msg.data);
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!closed && retries < maxRetries) {
        retries++;
        setTimeout(connect, retryDelay);
      }
    };
  }

  connect();

  return {
    on(type: string, handler: MessageHandler) {
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }
      handlers.get(type)!.add(handler);
    },
    off(type: string, handler: MessageHandler) {
      handlers.get(type)?.delete(handler);
    },
    close() {
      closed = true;
      ws?.close();
    },
  };
}
