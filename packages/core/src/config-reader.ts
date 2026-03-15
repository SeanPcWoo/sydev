import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkspaceConfig } from './schemas/workspace-schema.js';
import type { ProjectConfig } from './schemas/project-schema.js';
import type { DeviceConfig } from './schemas/device-schema.js';

export interface WorkspaceStatus {
  configured: boolean;
  config?: WorkspaceConfig;
  path: string;
}

export class ConfigReader {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd ?? process.cwd();
  }

  getWorkspaceStatus(): WorkspaceStatus {
    try {
      const raw = readFileSync(join(this.cwd, '.realevo', 'workspace.json'), 'utf-8');
      const config = JSON.parse(raw) as WorkspaceConfig;
      return { configured: true, config, path: this.cwd };
    } catch {
      return { configured: false, path: this.cwd };
    }
  }

  getProjects(): ProjectConfig[] {
    try {
      const raw = readFileSync(join(this.cwd, '.realevo', 'projects.json'), 'utf-8');
      return JSON.parse(raw) as ProjectConfig[];
    } catch {
      return [];
    }
  }

  getDevices(): DeviceConfig[] {
    try {
      const raw = readFileSync(join(this.cwd, '.sydev', 'devices.json'), 'utf-8');
      return JSON.parse(raw) as DeviceConfig[];
    } catch {
      return [];
    }
  }
}
