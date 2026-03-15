import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { createWsClient } from '@/lib/ws';
import { BatchItemForm } from '@/components/batch/BatchItemForm';
import { BatchProgressList, type BatchItemStatus } from '@/components/batch/BatchProgressList';
import { ExportPanel } from '@/components/batch/ExportPanel';

interface BatchResult {
  total: number;
  succeeded: number;
  failed: number;
  items: BatchItemStatus[];
}

export function BatchPage() {
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [devices, setDevices] = useState<Record<string, unknown>[]>([]);
  const [cwd, setCwd] = useState('');
  const [executing, setExecuting] = useState(false);
  const [items, setItems] = useState<BatchItemStatus[] | null>(null);

  // WebSocket for real-time progress
  useEffect(() => {
    if (!executing) return;
    const ws = createWsClient();

    const onStep = (data: unknown) => {
      const step = data as { name: string; progress: number };
      setItems((prev) => {
        if (!prev) return prev;
        return prev.map((item) => {
          const key = `batch:${item.type}:${item.name}`;
          if (step.name !== key) return item;
          if (step.progress === 100) return { ...item, status: 'success' as const };
          return { ...item, status: 'running' as const };
        });
      });
    };

    const onError = (data: unknown) => {
      const err = data as { error: string };
      setItems((prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex((i) => i.status === 'running');
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], status: 'failed', error: err.error };
        return next;
      });
    };

    ws.on('step', onStep);
    ws.on('error', onError);

    return () => ws.close();
  }, [executing]);

  const buildInitialItems = useCallback((): BatchItemStatus[] => [
    ...projects.map((p) => ({ name: p.name as string, type: 'project' as const, status: 'pending' as const })),
    ...devices.map((d) => ({ name: d.name as string, type: 'device' as const, status: 'pending' as const })),
  ], [projects, devices]);

  async function handleExecute() {
    if (projects.length === 0 && devices.length === 0) return;
    setItems(buildInitialItems());
    setExecuting(true);
    try {
      const result = await api.post<BatchResult>('/api/batch/execute', { cwd, projects, devices });
      setItems(result.items);
    } catch (err) {
      // keep whatever WS state we have
    } finally {
      setExecuting(false);
    }
  }

  async function handleRetryFailed() {
    if (!items) return;
    const failedItems = items
      .filter((i) => i.status === 'failed')
      .map((i) => {
        const config = i.type === 'project'
          ? projects.find((p) => p.name === i.name)
          : devices.find((d) => d.name === i.name);
        return { type: i.type, config };
      })
      .filter((i) => i.config);

    // Reset failed items to pending
    setItems((prev) => prev ? prev.map((i) => i.status === 'failed' ? { ...i, status: 'pending' as const, error: undefined } : i) : prev);
    setExecuting(true);
    try {
      const result = await api.post<BatchResult>('/api/batch/retry', { cwd, items: failedItems });
      setItems((prev) => {
        if (!prev) return result.items;
        return prev.map((existing) => {
          const updated = result.items.find((r) => r.name === existing.name && r.type === existing.type);
          return updated ?? existing;
        });
      });
    } catch {
      // keep current state
    } finally {
      setExecuting(false);
    }
  }

  const canExecute = (projects.length > 0 || devices.length > 0) && cwd.length > 0 && !executing;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">批量操作</h1>

      <Card>
        <CardHeader><CardTitle>批量配置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-cwd">Workspace 路径</Label>
            <Input id="batch-cwd" value={cwd} onChange={(e) => setCwd(e.target.value)} placeholder="/path/to/workspace" />
          </div>

          <Tabs defaultValue="project">
            <TabsList>
              <TabsTrigger value="project">项目</TabsTrigger>
              <TabsTrigger value="device">设备</TabsTrigger>
            </TabsList>
            <TabsContent value="project" className="space-y-4">
              <BatchItemForm type="project" onAdd={(config) => setProjects((prev) => [...prev, config])} />
              {projects.length > 0 && (
                <ul className="space-y-1" role="list" aria-label="已添加项目">
                  {projects.map((p, i) => (
                    <li key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{p.name as string} {p.template ? `(${p.template})` : ''}</span>
                      <button type="button" onClick={() => setProjects((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground" aria-label={`删除 ${p.name}`}><X className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="device" className="space-y-4">
              <BatchItemForm type="device" onAdd={(config) => setDevices((prev) => [...prev, config])} />
              {devices.length > 0 && (
                <ul className="space-y-1" role="list" aria-label="已添加设备">
                  {devices.map((d, i) => (
                    <li key={i} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{d.name as string} ({d.ip as string})</span>
                      <button type="button" onClick={() => setDevices((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground" aria-label={`删除 ${d.name}`}><X className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>

          <Button onClick={handleExecute} disabled={!canExecute}>
            {executing ? '执行中...' : '开始执行'}
          </Button>
        </CardContent>
      </Card>

      {items && (
        <Card>
          <CardHeader><CardTitle>执行结果</CardTitle></CardHeader>
          <CardContent>
            <BatchProgressList items={items} onRetryFailed={handleRetryFailed} />
          </CardContent>
        </Card>
      )}

      <ExportPanel workspace={cwd ? { cwd } as Record<string, unknown> : undefined} projects={projects} devices={devices} />
    </div>
  );
}
