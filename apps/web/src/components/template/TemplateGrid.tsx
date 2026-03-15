import { Pencil, Download, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  type: 'workspace' | 'project' | 'device' | 'full';
  createdAt: string;
  updatedAt: string;
}

interface TemplateGridProps {
  templates: TemplateMeta[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

const typeColors: Record<string, string> = {
  workspace: 'bg-blue-100 text-blue-800 border-blue-200',
  project: 'bg-green-100 text-green-800 border-green-200',
  device: 'bg-orange-100 text-orange-800 border-orange-200',
  full: 'bg-purple-100 text-purple-800 border-purple-200',
};

const typeLabels: Record<string, string> = {
  workspace: '工作空间',
  project: '项目',
  device: '设备',
  full: '完整配置',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function TemplateGrid({ templates, onEdit, onDelete, onExport }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg">暂无模板</p>
        <p className="text-sm mt-1">点击上方按钮创建或导入模板</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => (
        <Card key={t.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{t.name}</CardTitle>
              <Badge className={typeColors[t.type] || ''} variant="outline">
                {typeLabels[t.type] || t.type}
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">
              {t.description || '无描述'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-xs text-muted-foreground">
              创建于 {formatDate(t.createdAt)}
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(t.id)} aria-label={`编辑 ${t.name}`}>
              <Pencil className="h-4 w-4 mr-1" /> 编辑
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onExport(t.id)} aria-label={`导出 ${t.name}`}>
              <Download className="h-4 w-4 mr-1" /> 导出
            </Button>
            <Button
              variant="ghost" size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => { if (window.confirm(`确定删除模板 "${t.name}" 吗？`)) onDelete(t.id); }}
              aria-label={`删除 ${t.name}`}
            >
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
