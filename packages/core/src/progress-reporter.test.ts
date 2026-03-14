import { describe, it, expect, vi } from 'vitest';
import { ProgressReporter } from './progress-reporter.js';

describe('ProgressReporter', () => {
  it('should extend EventEmitter and support on/emit', () => {
    const reporter = new ProgressReporter();

    expect(reporter.on).toBeDefined();
    expect(reporter.emit).toBeDefined();
    expect(typeof reporter.on).toBe('function');
    expect(typeof reporter.emit).toBe('function');
  });

  it('should emit step progress event with name and progress', () => {
    const reporter = new ProgressReporter();
    const listener = vi.fn();

    reporter.on('step', listener);
    reporter.reportStep('初始化环境', 50);

    expect(listener).toHaveBeenCalledWith({ name: '初始化环境', progress: 50 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should emit success event with message', () => {
    const reporter = new ProgressReporter();
    const listener = vi.fn();

    reporter.on('success', listener);
    reporter.reportSuccess('操作成功完成');

    expect(listener).toHaveBeenCalledWith('操作成功完成');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should emit error event with error, stack, and fixSuggestion', () => {
    const reporter = new ProgressReporter();
    const listener = vi.fn();

    reporter.on('error', listener);
    reporter.reportError('权限不足', 'Error: EACCES', '请使用 sudo 运行');

    expect(listener).toHaveBeenCalledWith({
      error: '权限不足',
      stack: 'Error: EACCES',
      fixSuggestion: '请使用 sudo 运行'
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should emit output event with output string', () => {
    const reporter = new ProgressReporter();
    const listener = vi.fn();

    reporter.on('output', listener);
    reporter.reportOutput('命令输出内容\n');

    expect(listener).toHaveBeenCalledWith('命令输出内容\n');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should support multiple listeners for the same event', () => {
    const reporter = new ProgressReporter();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    reporter.on('step', listener1);
    reporter.on('step', listener2);
    reporter.on('step', listener3);

    reporter.reportStep('测试步骤', 75);

    expect(listener1).toHaveBeenCalledWith({ name: '测试步骤', progress: 75 });
    expect(listener2).toHaveBeenCalledWith({ name: '测试步骤', progress: 75 });
    expect(listener3).toHaveBeenCalledWith({ name: '测试步骤', progress: 75 });
  });

  it('should support multiple different event types', () => {
    const reporter = new ProgressReporter();
    const stepListener = vi.fn();
    const successListener = vi.fn();
    const errorListener = vi.fn();
    const outputListener = vi.fn();

    reporter.on('step', stepListener);
    reporter.on('success', successListener);
    reporter.on('error', errorListener);
    reporter.on('output', outputListener);

    reporter.reportStep('步骤1', 25);
    reporter.reportOutput('输出内容');
    reporter.reportSuccess('成功');
    reporter.reportError('错误');

    expect(stepListener).toHaveBeenCalledTimes(1);
    expect(successListener).toHaveBeenCalledTimes(1);
    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(outputListener).toHaveBeenCalledTimes(1);
  });

  it('should allow removing listeners', () => {
    const reporter = new ProgressReporter();
    const listener = vi.fn();

    reporter.on('step', listener);
    reporter.reportStep('步骤1', 50);

    reporter.off('step', listener);
    reporter.reportStep('步骤2', 100);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ name: '步骤1', progress: 50 });
  });
});
