import { EventEmitter } from 'events';

export interface StepProgress {
  name: string;
  progress: number; // 0-100
}

export interface ErrorEvent {
  error: string;
  stack?: string;
  fixSuggestion?: string;
}

export class ProgressReporter extends EventEmitter {
  reportStep(name: string, progress: number): void {
    this.emit('step', { name, progress });
  }

  reportSuccess(message: string): void {
    this.emit('success', message);
  }

  reportError(error: string, stack?: string, fixSuggestion?: string): void {
    this.emit('error', { error, stack, fixSuggestion });
  }

  reportOutput(output: string): void {
    this.emit('output', output);
  }
}
