import { describe, expect, it } from 'vitest';
import { DeviceOptionParser } from './device-parser.js';

describe('DeviceOptionParser', () => {
  it('accepts the full shared platform list', () => {
    const parser = new DeviceOptionParser();

    const result = parser.parse({
      name: 'board-1',
      ip: '192.168.1.100',
      platforms: 'ARM_920T,RISCV_GC64_SOFT',
    });

    expect(result.config.platforms).toEqual(['ARM_920T', 'RISCV_GC64_SOFT']);
  });

  it('rejects unsupported platforms', () => {
    const parser = new DeviceOptionParser();

    expect(() => parser.parse({
      name: 'board-1',
      ip: '192.168.1.100',
      platforms: 'LOONGARCH64,NOT_A_PLATFORM',
    })).toThrow(/Invalid platforms/);
  });
});
