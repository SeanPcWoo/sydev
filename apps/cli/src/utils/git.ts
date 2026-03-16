import { execSync } from 'child_process';

/**
 * 通过 git ls-remote 获取远程仓库的默认分支名。
 * 失败时回退到 'master'。
 */
export function getRemoteDefaultBranch(repoUrl: string): string {
  try {
    const output = execSync(`git ls-remote --symref ${repoUrl} HEAD`, {
      encoding: 'utf-8',
      timeout: 15_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // 输出格式: ref: refs/heads/main\tHEAD
    const match = output.match(/ref:\s+refs\/heads\/(\S+)\s+HEAD/);
    return match?.[1] ?? 'master';
  } catch {
    return 'master';
  }
}

/**
 * 验证远程仓库中是否存在指定分支。
 * 返回 true 表示存在，false 表示不存在或查询失败。
 */
export function remoteBranchExists(repoUrl: string, branch: string): boolean {
  try {
    const output = execSync(`git ls-remote --heads ${repoUrl} ${branch}`, {
      encoding: 'utf-8',
      timeout: 15_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim().length > 0;
  } catch {
    return false;
  }
}
