import { ConfigManager } from './config-manager.js';
import { fullConfigSchema, type FullConfig } from './schemas/full-config-schema.js';
import { RlWrapper } from './rl-wrapper.js';
import { ProgressReporter } from './progress-reporter.js';

export interface StepError {
  step: string;
  error: string;
}

export interface InitResult {
  success: boolean;
  completedSteps: string[];
  failedSteps: StepError[];
  failedStep?: string;
  error?: string;
}

export interface InitOptions {
  onStepError?: (step: string, error: string) => Promise<boolean>;
}

export class InitOrchestrator {
  constructor(
    private rlWrapper: RlWrapper,
    private progressReporter: ProgressReporter,
  ) {}

  async execute(config: unknown, options?: InitOptions): Promise<InitResult> {
    // 1. 验证配置
    const validation = ConfigManager.validate(fullConfigSchema, config);
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        completedSteps: [],
        failedSteps: [],
        failedStep: 'validation',
        error: `配置验证失败: ${validation.errors?.join('; ') ?? '未知错误'}`,
      };
    }

    const parsed = validation.data as FullConfig;
    const completedSteps: string[] = [];
    const failedSteps: StepError[] = [];
    const totalSteps = 1
      + (parsed.projects?.length ?? 0)
      + (parsed.devices?.length ?? 0);
    let currentStep = 0;

    // 2. 初始化 workspace
    this.progressReporter.reportStep('workspace', 0);
    const wsResult = await this.rlWrapper.initWorkspace(parsed.workspace);
    if (!wsResult.success) {
      const wsError = wsResult.error ?? 'workspace 初始化失败';
      this.progressReporter.reportError(wsError);
      // workspace 失败必须停止，后续步骤依赖它
      return {
        success: false,
        completedSteps,
        failedSteps: [{ step: 'workspace', error: wsError }],
        failedStep: 'workspace',
        error: wsError,
      };
    }
    completedSteps.push('workspace');
    currentStep++;
    this.progressReporter.reportStep('workspace', 100);

    // 3. 顺序创建 projects
    for (const project of parsed.projects ?? []) {
      const stepName = `project:${project.name}`;
      this.progressReporter.reportStep(stepName, 0);
      const projResult = await this.rlWrapper.createProject({
        ...project,
        cwd: parsed.workspace.cwd,
      });
      if (!projResult.success) {
        const projError = projResult.error ?? `项目 ${project.name} 创建失败`;
        failedSteps.push({ step: stepName, error: projError });
        if (options?.onStepError) {
          this.progressReporter.reportStep(stepName, 100);
          const shouldContinue = await options.onStepError(stepName, projError);
          if (!shouldContinue) {
            return { success: false, completedSteps, failedSteps, failedStep: stepName, error: projError };
          }
        } else {
          this.progressReporter.reportError(projError);
          return { success: false, completedSteps, failedSteps, failedStep: stepName, error: projError };
        }
      } else {
        this.progressReporter.reportStep(stepName, 100);
        completedSteps.push(stepName);
      }
      currentStep++;
    }

    // 4. 顺序添加 devices
    for (const device of parsed.devices ?? []) {
      const stepName = `device:${device.name}`;
      this.progressReporter.reportStep(stepName, 0);
      const devResult = await this.rlWrapper.addDevice({
        ...device,
        cwd: parsed.workspace.cwd,
      });
      if (!devResult.success) {
        const devError = devResult.error ?? `设备 ${device.name} 添加失败`;
        failedSteps.push({ step: stepName, error: devError });
        if (options?.onStepError) {
          this.progressReporter.reportStep(stepName, 100);
          const shouldContinue = await options.onStepError(stepName, devError);
          if (!shouldContinue) {
            return { success: false, completedSteps, failedSteps, failedStep: stepName, error: devError };
          }
        } else {
          this.progressReporter.reportError(devError);
          return { success: false, completedSteps, failedSteps, failedStep: stepName, error: devError };
        }
      } else {
        this.progressReporter.reportStep(stepName, 100);
        completedSteps.push(stepName);
      }
      currentStep++;
    }

    const hasFailures = failedSteps.length > 0;
    if (!hasFailures) {
      this.progressReporter.reportSuccess('全流程初始化完成');
    }
    return { success: !hasFailures, completedSteps, failedSteps };
  }
}
