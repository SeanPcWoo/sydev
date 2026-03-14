import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRlCommand, checkToolchain, checkEnvironment } from './env-checker.js';
import * as childProcess from 'child_process';
import * as fs from 'fs';

vi.mock('child_process');
vi.mock('fs');

describe('env-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRlCommand', () => {
    it('should return unavailable when rl command not found', () => {
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        const error: any = new Error('Command not found');
        error.code = 'ENOENT';
        throw error;
      });

      const result = checkRlCommand();

      expect(result.available).toBe(false);
      expect(result.error).toContain('未找到 rl-workspace 命令');
      expect(result.fixSuggestion).toBeDefined();
    });

    it('should parse version and return available when rl command exists', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(
        Buffer.from('rl version 2.5.3\nRealEvo-Stream CLI Tool')
      );

      const result = checkRlCommand();

      expect(result.available).toBe(true);
      expect(result.version).toEqual({
        major: 2,
        minor: 5,
        patch: 3,
        raw: '2.5.3'
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle version parsing errors gracefully', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(
        Buffer.from('rl: unknown output format')
      );

      const result = checkRlCommand();

      expect(result.available).toBe(false);
      expect(result.error).toContain('解析版本号');
    });
  });

  describe('checkToolchain', () => {
    it('should return not installed when REALEVO_HOME not set and paths not exist', () => {
      delete process.env.REALEVO_HOME;
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = checkToolchain();

      expect(result.installed).toBe(false);
      expect(result.error).toContain('工具链');
    });

    it('should return installed when REALEVO_HOME is set and exists', () => {
      process.env.REALEVO_HOME = '/opt/realevo';
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = checkToolchain();

      expect(result.installed).toBe(true);
      expect(result.path).toBe('/opt/realevo');
      expect(result.error).toBeUndefined();
    });

    it('should check common installation paths when REALEVO_HOME not set', () => {
      delete process.env.REALEVO_HOME;
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // /opt/realevo
        .mockReturnValueOnce(true);  // ~/realevo

      const result = checkToolchain();

      expect(result.installed).toBe(true);
      expect(result.path).toBeDefined();
    });
  });

  describe('checkEnvironment', () => {
    it('should return overall true when rl unavailable but toolchain found', () => {
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        const error: any = new Error('Command not found');
        error.code = 'ENOENT';
        throw error;
      });
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = checkEnvironment();

      expect(result.overall).toBe(true);
      expect(result.rl.available).toBe(false);
    });

    it('should return overall true when rl available but toolchain not found', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(
        Buffer.from('rl version 2.5.3')
      );
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = checkEnvironment();

      expect(result.overall).toBe(true);
      expect(result.toolchain.installed).toBe(false);
    });

    it('should return overall true when both checks pass', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(
        Buffer.from('rl version 2.5.3')
      );
      process.env.REALEVO_HOME = '/opt/realevo';
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = checkEnvironment();

      expect(result.overall).toBe(true);
      expect(result.rl.available).toBe(true);
      expect(result.toolchain.installed).toBe(true);
    });
  });
});
