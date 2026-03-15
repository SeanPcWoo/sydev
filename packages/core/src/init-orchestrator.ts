import { ConfigManager } from './config-manager.js';
import { fullConfigSchema, type FullConfig } from './schemas/full-config-schema.js';
import { RlWrapper } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';

export interface InitResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
}

export class InitOrchestrator {
  constructor(
    private rlWrapper: RlWrapper,
    private progressReporter: ProgressReporter,
  ) {}

  async execute(config: unknown): Promise<InitResult> {
    // 1. 验证配置
    const validation = ConfigManager.validate(fullConfigSchema, config);
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        completedSteps: [],
        failedStep: 'validation',
        error: `配置验证失败: ${validation.errors?.join('; ') ?? '未知错误'}`,
      };
    }

    const parsed = validation.data as FullConfig;
    const completedSteps: string[] = [];
    const totalSteps = 1
      + (parsed.projects?.length ?? 0)
      + (parsed.devices?.length ?? 0);
    let currentStep = 0;

    // 2. 初始化 workspace
    this.progressReporter.reportStep('workspace', Math.round((currentStep / totalSteps) * 100));
    const wsResult = await this.rlWrapper.initWorkspace(parsed.workspace);
    if (!wsResult.success) {
      this.progressReporter.reportError(wsResult.error ?? 'workspace 初始化失败');
      return {
        success: false,
        completedSteps,
        failedStep: 'workspace',
        error: wsResult.error ?? 'workspace 初始化失败',
      };
    }
    completedSteps.push('workspace');
    currentStep++;
    this.progressReporter.reportStep('workspace', 100);

    // 3. 顺序创建 projects
    for (const project of parsed.projects ?? []) {
      const stepName = `project:${project.name}`;
      this.progressReporter.reportStep(stepName, Math.round((currentStep / totalSteps) * 100));
      const projResult = await this.rlWrapper.createProject({
        ...project,
        cwd: parsed.workspace.cwd,
      });
      if (!projResult.success) {
        this.progressReporter.reportError(projResult.error ?? `项目 ${project.name} 创建失败`);
        return {
          success: false,
          completedSteps,
          failedStep: stepName,
          error: projResult.error ?? `项目 ${project.name} 创建失败`,
        };
      }
      completedSteps.push(stepName);
      currentStep++;
    }

    // 4. 顺序添加 devices
    for (const device of parsed.devices ?? []) {
      const stepName = `device:${device.name}`;
      this.progressReporter.reportStep(stepName, Math.round((currentStep / totalSteps) * 100));
      const devResult = await this.rlWrapper.addDevice({
        ...device,
        cwd: parsed.workspace.cwd,
      });
      if (!devResult.success) {
        this.progressReporter.reportError(devResult.error ?? `设备 ${device.name} 添加失败`);
        return {
          success: false,
          completedSteps,
          failedStep: stepName,
          error: devResult.error ?? `设备 ${device.name} 添加失败`,
        };
      }
      completedSteps.push(stepName);
      currentStep++;
    }

    this.progressReporter.reportSuccess('全流程初始化完成');
    return { success: true, completedSteps };
  }
}
