import { EventEmitter } from 'events';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ScannedProject } from './workspace-scanner.js';
import type { DeviceConfig } from './schemas/device-schema.js';

export interface UploadOptions {
  device?: string;          // 指定设备名（否则从 .reproject 解析）
  quiet?: boolean;          // 静默模式
}

export interface UploadProjectResult {
  name: string;
  success: boolean;
  durationMs: number;
  message: string;
  filesUploaded?: number;
  device?: string;
}

export type UploadProgressEvent =
  | {
      type: 'start';
      projectName: string;
      device: string;
    }
  | {
      type: 'file-upload';
      projectName: string;
      file: string;
      remotePath: string;
    }
  | {
      type: 'done';
      result: UploadProjectResult;
    };

interface ReprojectConfig {
  device?: string;
  uploadPaths?: Array<{
    localPath: string;
    remotePath: string;
  }>;
}

export class UploadRunner extends EventEmitter {
  constructor(
    private projects: ScannedProject[],
    private workspaceRoot: string,
    private devices: Map<string, DeviceConfig>
  ) {
    super();
  }

  /** 从 .reproject 文件解析上传配置 */
  private parseReproject(projectPath: string): ReprojectConfig {
    const reprojPath = join(projectPath, '.reproject');
    if (!existsSync(reprojPath)) {
      return {};
    }

    try {
      const content = readFileSync(reprojPath, 'utf-8');
      const config: ReprojectConfig = {};

      // 解析设备名：<project><device>xxx</device></project>
      const deviceMatch = content.match(/<device>([^<]+)<\/device>/i);
      if (deviceMatch) {
        config.device = deviceMatch[1].trim();
      }

      // 解析上传路径：<file local="..." remote="..."/>
      const fileMatches = content.matchAll(/<file[^>]*local="([^"]*)"[^>]*remote="([^"]*)"/gi);
      config.uploadPaths = [];
      for (const match of fileMatches) {
        config.uploadPaths.push({
          localPath: match[1],
          remotePath: match[2],
        });
      }

      return config;
    } catch (err) {
      return {};
    }
  }

  /** 替换路径中的 $(WORKSPACE_projectname) 变量 */
  private replaceMacros(path: string, workspaceVars: Map<string, string>): string {
    let result = path;
    for (const [macro, value] of workspaceVars) {
      const pattern = new RegExp(`\\$\\(${macro}\\)`, 'g');
      result = result.replace(pattern, value);
    }
    return result;
  }

  /** 上传单个工程产物 */
  async uploadOne(
    project: ScannedProject,
    options?: UploadOptions
  ): Promise<UploadProjectResult> {
    const startTime = Date.now();

    try {
      // 解析 .reproject
      const reprojConfig = this.parseReproject(project.path);
      const deviceName = options?.device || reprojConfig.device;

      if (!deviceName) {
        return {
          name: project.name,
          success: false,
          durationMs: Date.now() - startTime,
          message: '未找到设备配置（未指定 --device，.reproject 中也无设备信息）',
        };
      }

      // 查找设备
      const device = this.devices.get(deviceName);
      if (!device) {
        return {
          name: project.name,
          success: false,
          durationMs: Date.now() - startTime,
          message: `设备 '${deviceName}' 未配置`,
          device: deviceName,
        };
      }

      // 构建 workspace 变量映射
      const workspaceVars = new Map<string, string>();
      for (const p of this.projects) {
        const varName = `WORKSPACE_${p.name.replace(/-/g, '_')}`;
        workspaceVars.set(varName, p.path);
      }

      // 替换路径宏
      const uploadPaths = reprojConfig.uploadPaths ?? [];
      const resolvedPaths = uploadPaths.map((path) => ({
        localPath: this.replaceMacros(path.localPath, workspaceVars),
        remotePath: this.replaceMacros(path.remotePath, workspaceVars),
      }));

      if (resolvedPaths.length === 0) {
        return {
          name: project.name,
          success: false,
          durationMs: Date.now() - startTime,
          message: '未配置上传路径（检查 .reproject）',
          device: deviceName,
        };
      }

      // 验证本地文件存在
      let uploadedCount = 0;
      for (const path of resolvedPaths) {
        if (!existsSync(path.localPath)) {
          return {
            name: project.name,
            success: false,
            durationMs: Date.now() - startTime,
            message: `文件不存在: ${path.localPath}`,
            device: deviceName,
          };
        }

        this.emit('progress', {
          type: 'file-upload',
          projectName: project.name,
          file: path.localPath,
          remotePath: path.remotePath,
        });

        uploadedCount++;
      }

      // TODO: 实现 FTP 上传
      // 目前仅验证配置，实际上传留作后续实现

      return {
        name: project.name,
        success: true,
        durationMs: Date.now() - startTime,
        message: `已验证上传配置 (${uploadedCount} 文件)`,
        filesUploaded: uploadedCount,
        device: deviceName,
      };
    } catch (err) {
      return {
        name: project.name,
        success: false,
        durationMs: Date.now() - startTime,
        message: `错误: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
