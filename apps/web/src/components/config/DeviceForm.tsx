import { useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useFormValidation } from '@/hooks/useFormValidation';
import { FormField } from '@/components/config/FormField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const deviceSchema = z.object({
  name: z.string().min(1, '设备名称不能为空'),
  ip: z.string().ip({ version: 'v4', message: '必须是有效的 IPv4 地址' }),
  platform: z.string().min(1, '平台不能为空'),
  ssh: z.number().int().min(1).max(65535).default(22),
  telnet: z.number().int().min(1).max(65535).default(23),
  ftp: z.number().int().min(1).max(65535).default(21),
  gdb: z.number().int().min(1).max(65535).default(1234),
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().optional(),
});

type DeviceValues = z.infer<typeof deviceSchema>;

interface SubmitResult {
  success: boolean;
  error?: string;
  fixSuggestion?: string;
}

export function DeviceForm() {
  const { values, errors, setField, touchField, validate, reset, submitting, setSubmitting } =
    useFormValidation<DeviceValues>(deviceSchema, {
      ssh: 22, telnet: 23, ftp: 21, gdb: 1234,
    });
  const [result, setResult] = useState<SubmitResult | null>(null);

  function setPortField(name: string, raw: string) {
    const num = raw === '' ? undefined : Number(raw);
    setField(name, num);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const v = validate();
    if (!v.valid) return;
    setSubmitting(true);
    try {
      const data = await api.post<SubmitResult>('/api/device/add', v.data);
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
          <AlertTitle>{result.success ? '添加成功' : '添加失败'}</AlertTitle>
          <AlertDescription>
            {result.success ? '设备已成功添加' : result.error}
            {result.fixSuggestion && <p className="mt-1 text-xs">{result.fixSuggestion}</p>}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="设备名称" name="name" error={errors.name} required>
          <Input id="name" value={(values.name as string) ?? ''} onChange={(e) => setField('name', e.target.value)} onBlur={() => touchField('name')} placeholder="my-device" />
        </FormField>
        <FormField label="IP 地址" name="ip" error={errors.ip} required>
          <Input id="ip" value={(values.ip as string) ?? ''} onChange={(e) => setField('ip', e.target.value)} onBlur={() => touchField('ip')} placeholder="192.168.1.100" />
        </FormField>
      </div>

      <FormField label="平台" name="platform" error={errors.platform} required>
        <Input id="platform" value={(values.platform as string) ?? ''} onChange={(e) => setField('platform', e.target.value)} onBlur={() => touchField('platform')} placeholder="ARM64_A53" />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="SSH 端口" name="ssh" error={errors.ssh}>
          <Input id="ssh" type="number" value={values.ssh ?? 22} onChange={(e) => setPortField('ssh', e.target.value)} onBlur={() => touchField('ssh')} />
        </FormField>
        <FormField label="Telnet 端口" name="telnet" error={errors.telnet}>
          <Input id="telnet" type="number" value={values.telnet ?? 23} onChange={(e) => setPortField('telnet', e.target.value)} onBlur={() => touchField('telnet')} />
        </FormField>
        <FormField label="FTP 端口" name="ftp" error={errors.ftp}>
          <Input id="ftp" type="number" value={values.ftp ?? 21} onChange={(e) => setPortField('ftp', e.target.value)} onBlur={() => touchField('ftp')} />
        </FormField>
        <FormField label="GDB 端口" name="gdb" error={errors.gdb}>
          <Input id="gdb" type="number" value={values.gdb ?? 1234} onChange={(e) => setPortField('gdb', e.target.value)} onBlur={() => touchField('gdb')} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="用户名" name="username" error={errors.username} required>
          <Input id="username" value={(values.username as string) ?? ''} onChange={(e) => setField('username', e.target.value)} onBlur={() => touchField('username')} placeholder="root" />
        </FormField>
        <FormField label="密码" name="password" error={errors.password} description="可选">
          <Input id="password" type="password" value={(values.password as string) ?? ''} onChange={(e) => setField('password', e.target.value)} onBlur={() => touchField('password')} />
        </FormField>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? '添加中...' : '添加设备'}
      </Button>
    </form>
  );
}
