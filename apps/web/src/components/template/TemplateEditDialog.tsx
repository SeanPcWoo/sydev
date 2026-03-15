import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TemplateMeta } from './TemplateGrid';

type TemplateType = 'workspace' | 'project' | 'device' | 'full';

interface TemplateEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; type: TemplateType; data: unknown }) => void;
  template?: { meta: TemplateMeta; content: unknown } | null;
}

export function TemplateEditDialog({ open, onClose, onSave, template }: TemplateEditDialogProps) {
  const isEdit = !!template;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TemplateType>('workspace');
  const [dataJson, setDataJson] = useState('{}');
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setName(template.meta.name);
      setDescription(template.meta.description);
      setType(template.meta.type);
      const content = template.content as { data?: unknown };
      setDataJson(JSON.stringify(content.data ?? content, null, 2));
    } else {
      setName('');
      setDescription('');
      setType('workspace');
      setDataJson('{}');
    }
    setError('');
  }, [template, open]);

  function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('请输入模板名称');
      return;
    }
    try {
      const parsed = JSON.parse(dataJson);
      onSave({ name: name.trim(), description: description.trim(), type, data: parsed });
    } catch {
      setError('JSON 格式无效，请检查配置数据');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑模板' : '创建模板'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改模板信息和配置数据' : '填写模板信息，输入 JSON 格式的配置数据'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tpl-name">名称</Label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="模板名称" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tpl-desc">描述</Label>
            <Input id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="模板描述（可选）" />
          </div>
          <div className="grid gap-2">
            <Label>类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="workspace">工作空间</SelectItem>
                <SelectItem value="project">项目</SelectItem>
                <SelectItem value="device">设备</SelectItem>
                <SelectItem value="full">完整配置</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tpl-data">配置数据 (JSON)</Label>
            <textarea
              id="tpl-data"
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              value={dataJson}
              onChange={(e) => setDataJson(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>{isEdit ? '保存' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
