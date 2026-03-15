import { useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/config/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const PLATFORM_VALUES = [
  'ARM_926H', 'ARM_926S', 'ARM_920T',
  'ARM_A5', 'ARM_A5_SOFT',
  'ARM_A7', 'ARM_A7_SOFT',
  'ARM_A8', 'ARM_A8_SOFT',
  'ARM_A9', 'ARM_A9_SOFT',
  'ARM_A15', 'ARM_A15_SOFT',
  'ARM_V7A', 'ARM_V7A_SOFT',
  'ARM64_A53', 'ARM64_A55', 'ARM64_A57', 'ARM64_A72', 'ARM64_GENERIC',
  'MIPS32', 'MIPS32_SOFT', 'MIPS32_R2', 'MIPS32_R2_SOFT',
  'MIPS64_R2', 'MIPS64_R2_SOFT', 'MIPS64_LS3A', 'MIPS64_LS3A_SOFT',
  'x86_PENTIUM', 'x86_PENTIUM_SOFT', 'X86_64',
  'PPC_750', 'PPC_750_SOFT',
  'PPC_464FP', 'PPC_464FP_SOFT',
  'PPC_E500V1', 'PPC_E500V1_SOFT',
  'PPC_E500V2', 'PPC_E500V2_SOFT',
  'PPC_E500MC', 'PPC_E500MC_SOFT',
  'PPC_E5500', 'PPC_E5500_SOFT',
  'PPC_E6500', 'PPC_E6500_SOFT',
  'SPARC_LEON3', 'SPARC_LEON3_SOFT',
  'SPARC_V8', 'SPARC_V8_SOFT',
  'RISCV_GC32', 'RISCV_GC32_SOFT',
  'RISCV_GC64', 'RISCV_GC64_SOFT',
  'LOONGARCH64', 'LOONGARCH64_SOFT',
  'CSKY_CK807', 'CSKY_CK807_SOFT',
  'CSKY_CK810', 'CSKY_CK810_SOFT',
  'CSKY_CK860', 'CSKY_CK860_SOFT',
  'SW6B', 'SW6B_SOFT',
] as const;

const workspaceSchema = z.object({
  cwd: z.string().min(1, '工作路径不能为空'),
  basePath: z.string().min(1, 'Base 路径不能为空'),
  platform: z.enum(PLATFORM_VALUES, {
    errorMap: () => ({ message: '请选择平台' }),
  }),
  version: z.enum(['default', 'ecs_3.6.5', 'lts_3.6.5', 'lts_3.6.5_compiled', 'research', 'custom']).default('default'),
  createbase: z.boolean().default(false),
  build: z.boolean().default(false),
  debugLevel: z.enum(['debug', 'release']).default('release'),
  os: z.enum(['sylixos', 'linux']).default('sylixos'),
});

type WorkspaceValues = z.infer<typeof workspaceSchema>;

const PLATFORM_GROUPS: Record<string, readonly string[]> = {
  'ARM (32-bit)': ['ARM_926H', 'ARM_926S', 'ARM_920T', 'ARM_A5', 'ARM_A5_SOFT', 'ARM_A7', 'ARM_A7_SOFT', 'ARM_A8', 'ARM_A8_SOFT', 'ARM_A9', 'ARM_A9_SOFT', 'ARM_A15', 'ARM_A15_SOFT', 'ARM_V7A', 'ARM_V7A_SOFT'],
  'ARM (64-bit)': ['ARM64_A53', 'ARM64_A55', 'ARM64_A57', 'ARM64_A72', 'ARM64_GENERIC'],
  MIPS: ['MIPS32', 'MIPS32_SOFT', 'MIPS32_R2', 'MIPS32_R2_SOFT', 'MIPS64_R2', 'MIPS64_R2_SOFT', 'MIPS64_LS3A', 'MIPS64_LS3A_SOFT'],
  x86: ['x86_PENTIUM', 'x86_PENTIUM_SOFT', 'X86_64'],
  PowerPC: ['PPC_750', 'PPC_750_SOFT', 'PPC_464FP', 'PPC_464FP_SOFT', 'PPC_E500V1', 'PPC_E500V1_SOFT', 'PPC_E500V2', 'PPC_E500V2_SOFT', 'PPC_E500MC', 'PPC_E500MC_SOFT', 'PPC_E5500', 'PPC_E5500_SOFT', 'PPC_E6500', 'PPC_E6500_SOFT'],
  SPARC: ['SPARC_LEON3', 'SPARC_LEON3_SOFT', 'SPARC_V8', 'SPARC_V8_SOFT'],
  'RISC-V': ['RISCV_GC32', 'RISCV_GC32_SOFT', 'RISCV_GC64', 'RISCV_GC64_SOFT'],
  LoongArch: ['LOONGARCH64', 'LOONGARCH64_SOFT'],
  'C-SKY': ['CSKY_CK807', 'CSKY_CK807_SOFT', 'CSKY_CK810', 'CSKY_CK810_SOFT', 'CSKY_CK860', 'CSKY_CK860_SOFT'],
  SW: ['SW6B', 'SW6B_SOFT'],
};

const VERSION_OPTIONS = [
  { value: 'default', label: '默认版本' },
  { value: 'ecs_3.6.5', label: 'ECS 3.6.5' },
  { value: 'lts_3.6.5', label: 'LTS 3.6.5' },
  { value: 'lts_3.6.5_compiled', label: 'LTS 3.6.5 (已编译)' },
  { value: 'research', label: 'Research' },
  { value: 'custom', label: '自定义' },
];

interface SubmitResult {
  success: boolean;
  error?: string;
  fixSuggestion?: string;
}

export function WorkspaceForm() {
  const { values, errors, setField, touchField, validate, reset, submitting, setSubmitting } =
    useFormValidation<WorkspaceValues>(workspaceSchema, {
      version: 'default',
      createbase: false,
      build: false,
      debugLevel: 'release',
      os: 'sylixos',
    });
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const v = validate();
    if (!v.valid) return;
    setSubmitting(true);
    try {
      const data = await api.post<SubmitResult>('/api/workspace/init', v.data);
      setResult(data);
      if (data.success) reset();
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : '请求失败' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'} className={result.success ? 'border-green-500 text-green-700' : ''}>
          <AlertTitle>{result.success ? '初始化成功' : '初始化失败'}</AlertTitle>
          <AlertDescription>
            {result.success ? 'Workspace 已成功初始化' : result.error}
            {result.fixSuggestion && <p className="mt-1 text-xs">{result.fixSuggestion}</p>}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="工作路径" name="cwd" error={errors.cwd} required>
          <Input id="cwd" value={(values.cwd as string) ?? ''} onChange={(e) => setField('cwd', e.target.value)} onBlur={() => touchField('cwd')} placeholder="/path/to/workspace" />
        </FormField>
        <FormField label="Base 路径" name="basePath" error={errors.basePath} required description="SylixOS Base 安装路径">
          <Input id="basePath" value={(values.basePath as string) ?? ''} onChange={(e) => setField('basePath', e.target.value)} onBlur={() => touchField('basePath')} placeholder="/path/to/base" />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="平台" name="platform" error={errors.platform} required>
          <Select value={(values.platform as string) ?? ''} onValueChange={(v) => { setField('platform', v); touchField('platform'); }}>
            <SelectTrigger id="platform"><SelectValue placeholder="选择平台" /></SelectTrigger>
            <SelectContent>
              {Object.entries(PLATFORM_GROUPS).map(([group, platforms]) => (
                <div key={group}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                  {platforms.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="版本" name="version" error={errors.version}>
          <Select value={(values.version as string) ?? 'default'} onValueChange={(v) => setField('version', v)}>
            <SelectTrigger id="version"><SelectValue /></SelectTrigger>
            <SelectContent>
              {VERSION_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="调试级别" name="debugLevel" error={errors.debugLevel}>
          <Select value={(values.debugLevel as string) ?? 'release'} onValueChange={(v) => setField('debugLevel', v)}>
            <SelectTrigger id="debugLevel"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="release">Release</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="操作系统" name="os" error={errors.os}>
          <Select value={(values.os as string) ?? 'sylixos'} onValueChange={(v) => setField('os', v)}>
            <SelectTrigger id="os"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sylixos">SylixOS</SelectItem>
              <SelectItem value="linux">Linux</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="flex items-center gap-6">
        <label htmlFor="createbase" className="flex items-center gap-2 text-sm">
          <input type="checkbox" id="createbase" checked={!!values.createbase} onChange={(e) => setField('createbase', e.target.checked)} className="h-4 w-4 rounded border-input" />
          创建 Base
        </label>
        <label htmlFor="build" className="flex items-center gap-2 text-sm">
          <input type="checkbox" id="build" checked={!!values.build} onChange={(e) => setField('build', e.target.checked)} className="h-4 w-4 rounded border-input" />
          构建 Workspace
        </label>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? '初始化中...' : '初始化 Workspace'}
      </Button>
    </form>
  );
}
