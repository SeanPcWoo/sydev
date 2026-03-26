import { describe, expect, it } from 'vitest';
import { WorkspaceOptionParser } from './workspace-parser.js';

describe('WorkspaceOptionParser', () => {
  it('accepts the full shared platform list', () => {
    const parser = new WorkspaceOptionParser();

    const result = parser.parse({
      cwd: '/tmp/ws',
      basePath: '/tmp/base',
      platforms: 'ARM_926H,CSKY_CK860_SOFT',
    });

    expect(result.config.platforms).toEqual(['ARM_926H', 'CSKY_CK860_SOFT']);
  });

  it('rejects unsupported platforms', () => {
    const parser = new WorkspaceOptionParser();

    expect(() => parser.parse({
      cwd: '/tmp/ws',
      basePath: '/tmp/base',
      platforms: 'ARM_926H,NOT_A_PLATFORM',
    })).toThrow(/Invalid platforms/);
  });
});
