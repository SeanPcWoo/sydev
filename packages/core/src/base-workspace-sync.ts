import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type BaseMultiPlatformMkPatchStatus = 'missing' | 'patched' | 'unpatched';

export interface BaseWorkspaceSyncResult {
  basePath?: string;
  configMkPlatformsSynced: boolean;
  multiPlatformMkExists: boolean;
  multiPlatformMkUpdated: boolean;
}

export interface BaseMultiPlatformMkSyncResult {
  exists: boolean;
  changed: boolean;
}

export function syncBaseWorkspaceArtifacts(workspaceRoot: string, fallbackBasePath?: string): BaseWorkspaceSyncResult {
  const rawConfig = readWorkspaceBaseConfig(workspaceRoot);
  const basePath = typeof rawConfig?.base === 'string' && rawConfig.base.trim()
    ? rawConfig.base.trim()
    : fallbackBasePath;

  if (!basePath) {
    return {
      basePath: undefined,
      configMkPlatformsSynced: false,
      multiPlatformMkExists: false,
      multiPlatformMkUpdated: false,
    };
  }

  const multiPlatform = syncBaseMultiPlatformMk(basePath);

  return {
    basePath,
    configMkPlatformsSynced: syncBaseConfigMkPlatforms(basePath, rawConfig?.platforms),
    multiPlatformMkExists: multiPlatform.exists,
    multiPlatformMkUpdated: multiPlatform.changed,
  };
}

export function syncBaseConfigMkPlatforms(basePath: string, platforms: unknown): boolean {
  const normalizedPlatforms = normalizePlatforms(platforms);
  if (normalizedPlatforms.length === 0) {
    return false;
  }

  const configMkPath = join(basePath, 'config.mk');
  if (!existsSync(configMkPath)) {
    return false;
  }

  const content = readFileSync(configMkPath, 'utf-8');
  const replacementPlatforms = normalizedPlatforms.join(' ');
  const replacementLine = `PLATFORMS := ${replacementPlatforms}`;
  const nextContent = /^\s*PLATFORMS\s*[:?+]?=.*$/m.test(content)
    ? content.replace(/^(\s*PLATFORMS\s*)([:?+]?=).*$/m, `$1$2 ${replacementPlatforms}`)
    : appendConfigLine(content, replacementLine);

  if (nextContent !== content) {
    writeFileSync(configMkPath, nextContent, 'utf-8');
    return true;
  }

  return false;
}

export function getBaseMultiPlatformMkPatchStatus(basePath: string): BaseMultiPlatformMkPatchStatus {
  const multiPlatformMkPath = getBaseMultiPlatformMkPath(basePath);
  if (!existsSync(multiPlatformMkPath)) {
    return 'missing';
  }

  const content = readFileSync(multiPlatformMkPath, 'utf-8');
  return applyMultiPlatformMkPatch(content) === content ? 'patched' : 'unpatched';
}

export function syncBaseMultiPlatformMk(basePath: string): BaseMultiPlatformMkSyncResult {
  const multiPlatformMkPath = getBaseMultiPlatformMkPath(basePath);
  if (!existsSync(multiPlatformMkPath)) {
    return { exists: false, changed: false };
  }

  const content = readFileSync(multiPlatformMkPath, 'utf-8');
  const nextContent = applyMultiPlatformMkPatch(content);

  if (nextContent !== content) {
    writeFileSync(multiPlatformMkPath, nextContent, 'utf-8');
    return { exists: true, changed: true };
  }

  return { exists: true, changed: false };
}

function readWorkspaceBaseConfig(workspaceRoot: string): { base?: unknown; platforms?: unknown } | undefined {
  const realevoConfigPath = join(workspaceRoot, '.realevo', 'config.json');
  if (!existsSync(realevoConfigPath)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(realevoConfigPath, 'utf-8')) as {
      base?: unknown;
      platforms?: unknown;
    };
  } catch {
    return undefined;
  }
}

function getBaseMultiPlatformMkPath(basePath: string): string {
  return join(basePath, 'libsylixos', 'SylixOS', 'mktemp', 'multi-platform.mk');
}

function applyMultiPlatformMkPatch(content: string): string {
  return content
    .replace(
      /^([ \t]*)@\$\(foreach platform,\$\(PLATFORMS\),make all\b(.*)$/gm,
      '$1+@$(foreach platform,$(PLATFORMS),$(MAKE) all$2'
    )
    .replace(
      /^([ \t]*)@\$\(foreach platform,\$\(PLATFORMS\),make clean\b(.*)$/gm,
      '$1+@$(foreach platform,$(PLATFORMS),$(MAKE) clean$2'
    )
    .replace(/^([ \t]*)make all -j[ \t]*$/gm, '$1$(MAKE) all')
    .replace(/^([ \t]*)make clean -j[ \t]*$/gm, '$1$(MAKE) clean');
}

function normalizePlatforms(platforms: unknown): string[] {
  if (!Array.isArray(platforms)) {
    return [];
  }

  const deduped = new Set<string>();
  for (const platform of platforms) {
    if (typeof platform !== 'string') continue;
    const normalized = platform.trim();
    if (!normalized) continue;
    deduped.add(normalized);
  }
  return [...deduped];
}

function appendConfigLine(content: string, line: string): string {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  if (content.length === 0) {
    return `${line}${eol}`;
  }
  return content.endsWith('\n')
    ? `${content}${line}${eol}`
    : `${content}${eol}${line}${eol}`;
}
