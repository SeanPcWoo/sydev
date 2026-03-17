import * as fs from 'fs';
import * as path from 'path';

export interface ScannedProject {
  name: string;  // 目录名
  path: string;  // 绝对路径
}

const SKIP_DIRS = new Set(['Debug', 'Release', 'debug', 'release', 'node_modules', 'dist']);

export class WorkspaceScanner {
  constructor(private workspaceRoot: string) {}

  /**
   * 扫描 workspaceRoot 一级子目录，返回同时含 .project 和 Makefile 的工程列表。
   * 跳过隐藏目录（以 . 开头）和已知构建输出目录。
   * 如果 workspaceRoot 不存在或读取失败，返回空数组。
   */
  scan(): ScannedProject[] {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(this.workspaceRoot, { withFileTypes: true });
    } catch {
      return [];
    }

    const results: ScannedProject[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const dirPath = path.resolve(this.workspaceRoot, entry.name);
      const hasProject = fs.existsSync(path.join(dirPath, '.project'));
      const hasMakefile = fs.existsSync(path.join(dirPath, 'Makefile'));

      if (hasProject && hasMakefile) {
        results.push({ name: entry.name, path: dirPath });
      }
    }

    return results;
  }
}
