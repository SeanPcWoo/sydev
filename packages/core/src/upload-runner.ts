import { EventEmitter } from 'events';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import type Client from 'ftp';
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
  private basePath: string | undefined;

  constructor(
    private projects: ScannedProject[],
    private workspaceRoot: string,
    private devices: Map<string, DeviceConfig>
  ) {
    super();
    // 读取 base 路径
    try {
      const raw = readFileSync(join(workspaceRoot, '.realevo', 'config.json'), 'utf-8');
      const config = JSON.parse(raw);
      this.basePath = config.base;
    } catch {
      // config.json 不存在或无效
    }
    // 自动添加 base 工程（如果存在 .reproject）
    if (this.basePath && existsSync(join(this.basePath, '.reproject'))) {
      const hasBase = this.projects.some(p => p.name === 'base');
      if (!hasBase) {
        this.projects.unshift({ name: 'base', path: this.basePath });
      }
    }
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

      // 解析设备名：<DeviceSetting DevName="xxx"/>
      const deviceMatch = content.match(/DevName="([^"]*)/i);
      if (deviceMatch) {
        config.device = deviceMatch[1].trim();
      }

      // 解析上传路径：支持两种格式
      // 1. <file local="..." remote="..."/>
      // 2. <PairItem key="..." value="..."/> （key 是本地路径，value 是远程路径）
      config.uploadPaths = [];

      // 先尝试解析 <file> 格式
      const fileMatches = content.matchAll(/<file[^>]*local="([^"]*)"[^>]*remote="([^"]*)"/gi);
      for (const match of fileMatches) {
        config.uploadPaths.push({
          localPath: match[1],
          remotePath: match[2],
        });
      }

      // 如果没有找到 <file>，尝试解析 <PairItem> 格式
      if (config.uploadPaths.length === 0) {
        const pairMatches = content.matchAll(/<PairItem[^>]*key="([^"]*)"[^>]*value="([^"]*)"/gi);
        for (const match of pairMatches) {
          config.uploadPaths.push({
            localPath: match[1],
            remotePath: match[2],
          });
        }
      }

      return config;
    } catch (err) {
      return {};
    }
  }

  /** 从 config.mk 读取 DEBUG_LEVEL 并转换为 Release/Debug */
  private getOutputDir(projectPath: string): string {
    try {
      const configMkPath = join(projectPath, 'config.mk');
      if (!existsSync(configMkPath)) {
        return 'Release'; // 默认值
      }
      const content = readFileSync(configMkPath, 'utf-8');
      const match = content.match(/^DEBUG_LEVEL\s*[?:]?=\s*(.+)$/m);
      if (match) {
        const debugLevel = match[1].trim().toLowerCase();
        // 转换为首字母大写
        if (debugLevel === 'debug') {
          return 'Debug';
        }
      }
    } catch {
      // 读取失败，返回默认值
    }
    return 'Release';
  }

  /** 替换路径中的 $(WORKSPACE_projectname) 变量，处理 base 路径和 $(Output) */
  private replaceMacros(path: string, workspaceVars: Map<string, string>, projectPath?: string): string {
    let result = path;

    // 首先检查是否包含 libsylixos（base 项目的标志）
    if (result.includes('libsylixos') && this.basePath) {
      // 对于包含 libsylixos 的路径，用 base 路径替换 $(WORKSPACE_xxx)
      result = result.replace(/\$\(WORKSPACE_\w+\)/g, this.basePath);
    } else {
      // 普通工程路径，使用 workspace 变量替换
      for (const [macro, value] of workspaceVars) {
        const pattern = new RegExp(`\\$\\(${macro}\\)`, 'g');
        result = result.replace(pattern, value);
      }
    }

    // 处理 $(Output) 变量
    if (result.includes('$(Output)') && projectPath) {
      const outputDir = this.getOutputDir(projectPath);
      result = result.replace(/\$\(Output\)/g, outputDir);
    }

    return result;
  }

  /** 上传文件到 FTP 服务器 */
  private putFile(client: any, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject: (err: Error) => void) => {
      client.put(localPath, remotePath, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** 确保远端目录存在，必要时创建 */
  private ensureRemoteDir(client: any, remotePath: string): Promise<void> {
    return new Promise((resolve, reject: (err: Error) => void) => {
      const dir = remotePath.substring(0, remotePath.lastIndexOf('/'));
      if (!dir) {
        resolve();
        return;
      }

      // 尝试进入目录，如果失败则创建
      client.cwd(dir, (err: Error | null) => {
        if (err) {
          // 目录不存在，创建它
          client.mkdir(dir, true, (mkErr: Error | null) => {
            if (mkErr) reject(mkErr);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  /** 上传单个工程产物 */
  async uploadOne(
    project: ScannedProject,
    options?: UploadOptions
  ): Promise<UploadProjectResult> {
    const startTime = Date.now();

    try {
      // base 工程必须指定设备
      if (project.name === 'base' && !options?.device) {
        return {
          name: project.name,
          success: false,
          durationMs: Date.now() - startTime,
          message: '上传 base 工程必须指定 --device 参数',
        };
      }

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
        localPath: this.replaceMacros(path.localPath, workspaceVars, project.path),
        remotePath: this.replaceMacros(path.remotePath, workspaceVars, project.path),
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
      }

      // 连接 FTP 并上传
      const require = createRequire(import.meta.url);
      const FTPClient = require('ftp');
      const client: any = new FTPClient();

      return await new Promise((resolve) => {
        const handleError = (err: Error) => {
          client.destroy();
          resolve({
            name: project.name,
            success: false,
            durationMs: Date.now() - startTime,
            message: `FTP 连接失败: ${err.message}`,
            device: deviceName,
          });
        };

        client.on('error', handleError);

        client.connect({
          host: device.ip,
          port: device.ftp,
          user: device.username,
          password: device.password ?? '',
        });

        client.on('ready', async () => {
          try {
            let uploadedCount = 0;

            // 逐个上传文件
            for (const path of resolvedPaths) {
              this.emit('progress', {
                type: 'file-upload',
                projectName: project.name,
                file: path.localPath,
                remotePath: path.remotePath,
              });

              // 确保远端目录存在
              await this.ensureRemoteDir(client, path.remotePath);

              // 上传文件
              await this.putFile(client, path.localPath, path.remotePath);
              uploadedCount++;
            }

            client.end();

            resolve({
              name: project.name,
              success: true,
              durationMs: Date.now() - startTime,
              message: `上传完成 (${uploadedCount} 文件)`,
              filesUploaded: uploadedCount,
              device: deviceName,
            });
          } catch (err) {
            client.destroy();
            resolve({
              name: project.name,
              success: false,
              durationMs: Date.now() - startTime,
              message: `上传失败: ${err instanceof Error ? err.message : String(err)}`,
              device: deviceName,
            });
          }
        });
      });
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
