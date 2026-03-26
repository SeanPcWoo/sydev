import { describe, expect, it } from 'vitest';
import { applyNoLoopToQuestions } from './inquirer.js';

describe('applyNoLoopToQuestions', () => {
  it('should disable loop for list and checkbox prompts', () => {
    const questions = applyNoLoopToQuestions([
      { type: 'list', name: 'version', message: 'Base 版本:', choices: ['default'] },
      { type: 'checkbox', name: 'platform', message: '目标平台:', choices: ['ARM64_GENERIC'] },
      { type: 'confirm', name: 'confirm', message: '确认?' },
    ]);

    expect(questions).toEqual([
      { type: 'list', name: 'version', message: 'Base 版本:', choices: ['default'], loop: false },
      { type: 'checkbox', name: 'platform', message: '目标平台:', choices: ['ARM64_GENERIC'], loop: false },
      { type: 'confirm', name: 'confirm', message: '确认?' },
    ]);
  });

  it('should preserve explicit loop configuration', () => {
    const questions = applyNoLoopToQuestions([
      { type: 'list', name: 'version', message: 'Base 版本:', choices: ['default'], loop: true },
    ]);

    expect(questions).toEqual([
      { type: 'list', name: 'version', message: 'Base 版本:', choices: ['default'], loop: true },
    ]);
  });
});
