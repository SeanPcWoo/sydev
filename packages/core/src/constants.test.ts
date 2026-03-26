import { describe, expect, it } from 'vitest';
import { DEFAULT_PLATFORM, PLATFORMS, PLATFORM_VALUES, isValidPlatform } from './constants.js';

describe('platform constants', () => {
  it('exports a shared platform list for prompts and validation', () => {
    expect(DEFAULT_PLATFORM).toBe('ARM64_GENERIC');
    expect(PLATFORMS).toHaveLength(PLATFORM_VALUES.length);
    expect(PLATFORM_VALUES).toContain('ARM_926H');
    expect(PLATFORM_VALUES).toContain('CSKY_CK860_SOFT');
  });

  it('validates known platform values', () => {
    expect(isValidPlatform('ARM_926H')).toBe(true);
    expect(isValidPlatform('RISCV_GC64_SOFT')).toBe(true);
    expect(isValidPlatform('NOT_A_PLATFORM')).toBe(false);
  });
});
