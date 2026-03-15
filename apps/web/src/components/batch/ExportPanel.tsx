import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExportPanelProps {
  workspace?: Record<string, unknown>;
  projects: Record<string, unknown>[];
  devices: Record<string, unknown>[];
}

export function ExportPanel({ workspace, projects, devices }: ExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const command = 'sydev init --config sydev-config.json';

  if (!workspace) {
    return (
      <Card>
        <CardHeader><CardTitle>CLI 导出</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">请先在配置页面设置 Workspace</p>
        </CardContent>
      </Card>
    );
  }

  const fullConfig = {
    schemaVersion: 1,
    workspace,
    ...(projects.length > 0 ? { projects } : {}),
    ...(devices.length > 0 ? { devices } : {}),
  };

  function handleDownload() {
    const blob = new Blob([JSON.stringify(fullConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sydev-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API may not be available
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>CLI 导出</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={handleDownload}>下载配置文件</Button>
        <div className="space-y-2">
          <Label>CLI 命令</Label>
          <div className="flex gap-2">
            <Input readOnly value={command} className="font-mono text-sm" />
            <Button variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? '已复制' : '复制命令'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
