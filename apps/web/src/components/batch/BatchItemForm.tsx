import { z } from 'zod';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/config/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const projectSchema = z.object({
  name: z.string().min(3, '项目名称至少 3 个字符').max(50, '项目名称最多 50 个字符'),
  template: z.enum(['app', 'lib', 'common', 'ko', 'python_native_lib', 'uorb_pubsub', 'vsoa_pubsub', 'fast_dds_pubsub']).optional(),
  type: z.enum(['cmake', 'automake', 'realevo', 'ros2', 'python', 'cython', 'go', 'javascript']).optional(),
  makeTool: z.enum(['make', 'ninja']).default('make'),
});

const deviceSchema = z.object({
  name: z.string().min(1, '设备名称不能为空'),
  ip: z.string().ip({ version: 'v4', message: '必须是有效的 IPv4 地址' }),
  platform: z.string().min(1, '平台不能为空'),
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().optional(),
});

type ProjectValues = z.infer<typeof projectSchema>;
type DeviceValues = z.infer<typeof deviceSchema>;

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

const MAKE_TOOL_OPTIONS = [
  { value: 'make', label: 'Make' },
  { value: 'ninja', label: 'Ninja' },
];

interface BatchItemFormProps {
  type: 'project' | 'device';
  onAdd: (config: Record<string, unknown>) => void;
}

function ProjectForm({ onAdd }: { onAdd: (config: Record<string, unknown>) => void }) {
  const { values, errors, setField, touchField, validate, reset } =
    useFormValidation<ProjectValues>(projectSchema, { makeTool: 'make' });

  function handleAdd() {
    const v = validate();
    if (!v.valid) return;
    onAdd(v.data as unknown as Record<string, unknown>);
    reset();
  }

  return (
    <div className="space-y-4">
      <FormField label="项目名称" name="batch-proj-name" error={errors.name} required>
        <Input id="batch-proj-name" value={(values.name as string) ?? ''} onChange={(e) => setField('name', e.target.value)} onBlur={() => touchField('name')} placeholder="my-project" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="模板" name="batch-proj-template" error={errors.template}>
          <Select value={(values.template as string) ?? ''} onValueChange={(v) => { setField('template', v || undefined); touchField('template'); }}>
            <SelectTrigger id="batch-proj-template"><SelectValue placeholder="选择模板" /></SelectTrigger>
            <SelectContent>
              {TEMPLATE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="构建工具" name="batch-proj-makeTool" error={errors.makeTool}>
          <Select value={(values.makeTool as string) ?? 'make'} onValueChange={(v) => setField('makeTool', v)}>
            <SelectTrigger id="batch-proj-makeTool"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MAKE_TOOL_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <Button type="button" onClick={handleAdd}>添加项目</Button>
    </div>
  );
}

function DeviceForm({ onAdd }: { onAdd: (config: Record<string, unknown>) => void }) {
  const { values, errors, setField, touchField, validate, reset } =
    useFormValidation<DeviceValues>(deviceSchema, {});

  function handleAdd() {
    const v = validate();
    if (!v.valid) return;
    onAdd(v.data as unknown as Record<string, unknown>);
    reset();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="设备名称" name="batch-dev-name" error={errors.name} required>
          <Input id="batch-dev-name" value={(values.name as string) ?? ''} onChange={(e) => setField('name', e.target.value)} onBlur={() => touchField('name')} placeholder="my-device" />
        </FormField>
        <FormField label="IP 地址" name="batch-dev-ip" error={errors.ip} required>
          <Input id="batch-dev-ip" value={(values.ip as string) ?? ''} onChange={(e) => setField('ip', e.target.value)} onBlur={() => touchField('ip')} placeholder="192.168.1.100" />
        </FormField>
      </div>
      <FormField label="平台" name="batch-dev-platform" error={errors.platform} required>
        <Input id="batch-dev-platform" value={(values.platform as string) ?? ''} onChange={(e) => setField('platform', e.target.value)} onBlur={() => touchField('platform')} placeholder="ARM64_A53" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="用户名" name="batch-dev-username" error={errors.username} required>
          <Input id="batch-dev-username" value={(values.username as string) ?? ''} onChange={(e) => setField('username', e.target.value)} onBlur={() => touchField('username')} placeholder="root" />
        </FormField>
        <FormField label="密码" name="batch-dev-password" error={errors.password} description="可选">
          <Input id="batch-dev-password" type="password" value={(values.password as string) ?? ''} onChange={(e) => setField('password', e.target.value)} onBlur={() => touchField('password')} />
        </FormField>
      </div>
      <Button type="button" onClick={handleAdd}>添加设备</Button>
    </div>
  );
}

export function BatchItemForm({ type, onAdd }: BatchItemFormProps) {
  return type === 'project' ? <ProjectForm onAdd={onAdd} /> : <DeviceForm onAdd={onAdd} />;
}
