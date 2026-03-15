import { RlWrapper } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';
import type { ProjectCreateOptions } from './rl-wrapper.js';
import type { DeviceAddOptions } from './rl-wrapper.js';

export interface BatchItemStatus {
  name: string;
  type: 'project' | 'device';
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

export interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  items: BatchItemStatus[];
}

export class BatchExecutor {
  constructor(
    private rlWrapper: RlWrapper,
    private reporter: ProgressReporter
  ) {}

  async execute(
    cwd: string,
    projects: ProjectCreateOptions[],
    devices: DeviceAddOptions[]
  ): Promise<BatchResult> {
    const items: BatchItemStatus[] = [
      ...projects.map((p) => ({ name: p.name, type: 'project' as const, status: 'pending' as const })),
      ...devices.map((d) => ({ name: d.name, type: 'device' as const, status: 'pending' as const })),
    ];

    let succeeded = 0;
    let failed = 0;

    for (const item of items) {
      item.status = 'running';
      this.reporter.reportStep(`batch:${item.type}:${item.name}`, 0);

      try {
        let result;
        if (item.type === 'project') {
          const config = projects.find((p) => p.name === item.name)!;
          result = await this.rlWrapper.createProject({ ...config, cwd });
        } else {
          const config = devices.find((d) => d.name === item.name)!;
          result = await this.rlWrapper.addDevice({ ...config, cwd });
        }

        if (result.success) {
          item.status = 'success';
          this.reporter.reportStep(`batch:${item.type}:${item.name}`, 100);
          succeeded++;
        } else {
          item.status = 'failed';
          item.error = result.error || '未知错误';
          this.reporter.reportError(item.error);
          failed++;
        }
      } catch (err) {
        item.status = 'failed';
        item.error = err instanceof Error ? err.message : '未知错误';
        this.reporter.reportError(item.error);
        failed++;
      }
    }

    return { total: items.length, succeeded, failed, items };
  }

  async retryFailed(
    cwd: string,
    failedItems: Array<{ type: 'project' | 'device'; config: ProjectCreateOptions | DeviceAddOptions }>
  ): Promise<BatchResult> {
    const projects = failedItems
      .filter((i) => i.type === 'project')
      .map((i) => i.config as ProjectCreateOptions);
    const devices = failedItems
      .filter((i) => i.type === 'device')
      .map((i) => i.config as DeviceAddOptions);
    return this.execute(cwd, projects, devices);
  }
}
