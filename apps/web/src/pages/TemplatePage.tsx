import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TemplateGrid, type TemplateMeta } from '@/components/template/TemplateGrid';
import { TemplateEditDialog } from '@/components/template/TemplateEditDialog';
import { TemplateImport } from '@/components/template/TemplateImport';

type TemplateType = 'workspace' | 'project' | 'device' | 'full';

export function TemplatePage() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<{ meta: TemplateMeta; content: unknown } | null>(null);

  const loadTemplates = useCallback(async () => {
    const query = filterType !== 'all' ? `?type=${filterType}` : '';
    const data = await api.get<TemplateMeta[]>(`/api/templates${query}`);
    setTemplates(data);
  }, [filterType]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function handleCreate() {
    setEditTemplate(null);
    setEditOpen(true);
  }

  async function handleEdit(id: string) {
    const data = await api.get<{ meta: TemplateMeta; content: unknown }>(`/api/templates/${id}`);
    setEditTemplate(data);
    setEditOpen(true);
  }

  async function handleSave(payload: { name: string; description: string; type: TemplateType; data: unknown }) {
    if (editTemplate) {
      await api.put(`/api/templates/${editTemplate.meta.id}`, payload);
    } else {
      await api.post('/api/templates', payload);
    }
    setEditOpen(false);
    setEditTemplate(null);
    loadTemplates();
  }

  async function handleDelete(id: string) {
    await api.delete(`/api/templates/${id}`);
    loadTemplates();
  }

  function handleExport(id: string) {
    window.open(`/api/templates/${id}/export`, '_blank');
  }

  async function handleImport(data: { name: string; description: string; type: string; data: unknown }) {
    await api.post('/api/templates/import', data);
    setImportOpen(false);
    loadTemplates();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">模板管理</h1>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="全部类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="workspace">工作空间</SelectItem>
              <SelectItem value="project">项目</SelectItem>
              <SelectItem value="device">设备</SelectItem>
              <SelectItem value="full">完整配置</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> 导入
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" /> 创建模板
          </Button>
        </div>
      </div>

      <TemplateGrid
        templates={templates}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
      />

      <TemplateEditDialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditTemplate(null); }}
        onSave={handleSave}
        template={editTemplate}
      />

      <TemplateImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}