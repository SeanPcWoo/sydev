import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { WorkspaceCard } from '@/components/status/WorkspaceCard';
import { ProjectList } from '@/components/status/ProjectList';
import { DeviceList } from '@/components/status/DeviceList';

interface WorkspaceStatus {
  configured: boolean;
  config?: {
    cwd: string;
    basePath: string;
    platform: string;
    version: string;
    createbase: boolean;
    build: boolean;
    debugLevel: string;
    os: string;
  };
  path: string;
}

interface ProjectConfig {
  name: string;
  template?: string;
  type?: string;
  source?: string;
  branch?: string;
  debugLevel?: string;
  makeTool: string;
}

interface DeviceConfig {
  name: string;
  ip: string;
  platform: string;
  ssh: number;
  telnet: number;
  ftp: number;
  gdb: number;
  username: string;
  password?: string;
}

export function StatusPage() {
  const [workspace, setWorkspace] = useState<WorkspaceStatus | null>(null);
  const [projects, setProjects] = useState<ProjectConfig[]>([]);
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ws, pj, dv] = await Promise.all([
        api.get<WorkspaceStatus>('/api/status/workspace'),
        api.get<ProjectConfig[]>('/api/status/projects'),
        api.get<DeviceConfig[]>('/api/status/devices'),
      ]);
      setWorkspace(ws);
      setProjects(pj);
      setDevices(dv);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取状态失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">环境状态</h1>
        <button
          type="button"
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
          aria-label="刷新状态"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>请求失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !workspace ? (
        <p className="text-sm text-muted-foreground">加载中...</p>
      ) : (
        <>
          {workspace && (
            <WorkspaceCard
              configured={workspace.configured}
              config={workspace.config}
              path={workspace.path}
            />
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <ProjectList projects={projects} />
            <DeviceList devices={devices} />
          </div>
        </>
      )}
    </div>
  );
}
