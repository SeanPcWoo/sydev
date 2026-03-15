import type { WebSocketServer, WebSocket } from 'ws';
import type { ProgressReporter } from './progress-reporter.js';

export class WsBridge {
  private wss: WebSocketServer;
  private reporter: ProgressReporter | null = null;
  private listeners: Array<{ event: string; handler: (...args: unknown[]) => void }> = [];

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  attachReporter(reporter: ProgressReporter): void {
    this.detachReporter();
    this.reporter = reporter;

    const onStep = (data: unknown) => this.broadcast('step', data);
    const onSuccess = (message: unknown) => this.broadcast('success', message);
    const onError = (data: unknown) => this.broadcast('error', data);
    const onOutput = (output: unknown) => this.broadcast('output', output);

    reporter.on('step', onStep);
    reporter.on('success', onSuccess);
    reporter.on('error', onError);
    reporter.on('output', onOutput);

    this.listeners = [
      { event: 'step', handler: onStep },
      { event: 'success', handler: onSuccess },
      { event: 'error', handler: onError },
      { event: 'output', handler: onOutput },
    ];
  }

  broadcast(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const client of this.wss.clients) {
      if ((client as WebSocket).readyState === 1) {
        (client as WebSocket).send(message);
      }
    }
  }

  detachReporter(): void {
    if (this.reporter) {
      for (const { event, handler } of this.listeners) {
        this.reporter.off(event, handler);
      }
      this.listeners = [];
      this.reporter = null;
    }
  }
}
