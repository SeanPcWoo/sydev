import { describe, it, expect } from 'vitest';
import { ConfigManager } from './config-manager.js';
import { workspaceSchema, projectSchema, deviceSchema } from './schemas/index.js';

describe('ConfigManager', () => {
  describe('validate', () => {
    it('should validate valid workspace config', () => {
      const validConfig = {
        cwd: '/tmp/workspace',
        basePath: './base',
        platform: ['ARM64_GENERIC'],
        version: 'lts_3.6.5',
        createbase: false,
        build: false,
        debugLevel: 'release',
        os: 'sylixos'
      };

      const result = ConfigManager.validate(workspaceSchema, validConfig);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validConfig);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid workspace config with missing required fields', () => {
      const invalidConfig = {
        platform: ['ARM64_GENERIC']
        // missing cwd and basePath
      };

      const result = ConfigManager.validate(workspaceSchema, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0]).toContain('cwd');
    });

    it('should reject invalid workspace config with wrong type', () => {
      const invalidConfig = {
        cwd: '/tmp',
        basePath: './base',
        platform: ['invalid-platform']
      };

      const result = ConfigManager.validate(workspaceSchema, invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('平台');
    });
  });

  describe('merge', () => {
    it('should merge multiple config objects with later overriding earlier', () => {
      const config1 = { a: 1, b: 2 };
      const config2 = { b: 3, c: 4 };
      const config3 = { c: 5, d: 6 };

      const result = ConfigManager.merge(config1, config2, config3);

      expect(result).toEqual({ a: 1, b: 3, c: 5, d: 6 });
    });

    it('should handle empty configs', () => {
      const result = ConfigManager.merge({}, { a: 1 }, {});
      expect(result).toEqual({ a: 1 });
    });
  });

  describe('exportToJson', () => {
    it('should export config to formatted JSON string', () => {
      const config = {
        cwd: '/tmp',
        basePath: './base',
        platform: ['ARM64_GENERIC']
      };

      const json = ConfigManager.exportToJson(config);

      expect(json).toContain('"basePath"');
      expect(json).toContain('"./base"');
      expect(json).toContain('"platform"');
      expect(json).toContain('"ARM64_GENERIC"');
      expect(JSON.parse(json)).toEqual(config);
    });
  });

  describe('importFromJson', () => {
    it('should import and validate valid JSON config', () => {
      const json = JSON.stringify({
        cwd: '/tmp',
        basePath: './base',
        platform: ['ARM64_GENERIC']
      });

      const result = ConfigManager.importFromJson(workspaceSchema, json);

      expect(result.valid).toBe(true);
      expect(result.data?.cwd).toBe('/tmp');
      expect(result.data?.basePath).toBe('./base');
      expect(result.data?.platform).toEqual(['ARM64_GENERIC']);
    });

    it('should reject invalid JSON syntax', () => {
      const invalidJson = '{ invalid json }';

      const result = ConfigManager.importFromJson(workspaceSchema, invalidJson);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('JSON 解析失败');
    });

    it('should reject valid JSON but invalid config', () => {
      const json = JSON.stringify({
        cwd: '/tmp',
        basePath: './base',
        platform: ['invalid-platform']
      });

      const result = ConfigManager.importFromJson(workspaceSchema, json);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
