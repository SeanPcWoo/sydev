import { useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/config/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const projectSchema = z.object({
  name: z.string().min(3, '项目名称至少 3 个字符').max(50, '项目名称最多 50 个字符'),
  template: z.enum(['app', 'lib', 'common', 'ko', 'python_native_lib', 'uorb_pubsub', 'vsoa_pubsub', 'fast_dds_pubsub']).optional(),
  type: z.enum(['cmake', 'automake', 'realevo', 'ros2', 'python', 'cython', 'go', 'javascript']).optional(),
  source: z.string().optional(),
  branch: z.string().optional(),
  debugLevel: z.enum(['debug', 'release']).optional(),
  makeTool: z.enum(['make', 'ninja']).default('make'),
});

type ProjectValues = z.infer<typeof projectSchema>;

const TEMPLATE_OPTIONS = [
  { value: 'app', label: '应用程序 (app)' },
  { value: 'lib', label: '库 (lib)' },
  { value: 'common', label: '通用 (common)' },
  { value: 'ko', label: '内核模块 (ko)' },
  { value: 'python_native_lib', label: 'Python 原生库' },
  { value: 'uorb_pubsub', label: 'uORB 发布/订阅' },
  { value: 'vsoa_pubsub', label: 'VSOA 发布/订阅' },
  { value: 'fast_dds_pubsub', label: 'Fast DDS 发布/订阅' },
];

const TYPE_OPTIONS = [
  { value: 'cmake', label: 'CMake' },
  { value: 'automake', label: 'Automake' },
  { value: 'realevo', label: 'RealEvo' },
  { value: 'ros2', label: 'ROS2' },
  { value: 'python', label: 'Python' },
  { value: 'cython', label: 'Cython' },
  { value: 'go', label: 'Go' },
  { value: 'javascript', label: 'JavaScript' },
];

interface SubmitResult {
  success: boolean;
  error?: string;
  fixSuggestion?: string;
}

export function ProjectForm() {
  const { values, errors, setField, touchField, validate, reset, submitting, setSubmitting } =
    useFormValidation<ProjectValues>(projectSchema, { makeTool: 'make' });
  const [result, setResult] = useState<SubmitResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const v = validate();
    if (!v.valid) return;
    setSubmitting(true);
    try {
      const data = await api.post<SubmitResult>('/api/project/create', v.data);
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
          <AlertTitle>{result.success ? '创建成功' : '创建失败'}</AlertTitle>
          <AlertDescription>
            {result.success ? '项目已成功创建' : result.error}
            {result.fixSuggestion && <p className="mt-1 text-xs">{result.fixSuggestion}</p>}
          </AlertDescription>
        </Alert>
      )}

      <FormField label="项目名称" name="name" error={errors.name} required>
        <Input id="name" value={(values.name as string) ?? ''} onChange={(e) => setField('name', e.target.value)} onBlur={() => touchField('name')} placeholder="my-project" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="模板" name="template" error={errors.template} description="项目模板类型（可选）">
          <Select value={(values.template as string) ?? ''} onValueChange={(v) => { setField('template', v || undefined); touchField('template'); }}>
            <SelectTrigger id="template"><SelectValue placeholder="选择模板" /></SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="构建类型" name="type" error={errors.type} description="项目构建系统（可选）">
          <Select value={(values.type as string) ?? ''} onValueChange={(v) => { setField('type', v || undefined); touchField('type'); }}>
            <SelectTrigger id="type"><SelectValue placeholder="选择类型" /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Git 源码地址" name="source" error={errors.source} description="从 Git 仓库导入（可选）">
          <Input id="source" value={(values.source as string) ?? ''} onChange={(e) => setField('source', e.target.value)} onBlur={() => touchField('source')} placeholder="https://github.com/user/repo.git" />
        </FormField>
        <FormField label="分支" name="branch" error={errors.branch} description="Git 分支名（可选）">
          <Input id="branch" value={(values.branch as string) ?? ''} onChange={(e) => setField('branch', e.target.value)} onBlur={() => touchField('branch')} placeholder="main" />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="调试级别" name="debugLevel" error={errors.debugLevel} description="可选">
          <Select value={(values.debugLevel as string) ?? ''} onValueChange={(v) => { setField('debugLevel', v || undefined); }}>
            <SelectTrigger id="debugLevel"><SelectValue placeholder="选择级别" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="debug">Debug</SelectItem>
              <SelectItem value="release">Release</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="构建工具" name="makeTool" error={errors.makeTool}>
          <Select value={(values.makeTool as string) ?? 'make'} onValueChange={(v) => setField('makeTool', v)}>
            <SelectTrigger id="makeTool"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="make">Make</SelectItem>
              <SelectItem value="ninja">Ninja</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? '创建中...' : '创建项目'}
      </Button>
    </form>
  );
}
