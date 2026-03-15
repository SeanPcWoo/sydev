import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WorkspaceConfig {
  cwd: string;
  basePath: string;
  platform: string;
  version: string;
  createbase: boolean;
  build: boolean;
  debugLevel: string;
  os: string;
}

interface WorkspaceCardProps {
  configured: boolean;
  config?: WorkspaceConfig;
  path: string;
}

export function WorkspaceCard({ configured, config, path }: WorkspaceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderOpen className="h-5 w-5" />
          Workspace 状态
        </CardTitle>
      </CardHeader>
      <CardContent>
        {configured && config ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">工作路径</dt>
            <dd className="font-mono text-xs break-all">{config.cwd}</dd>
            <dt className="text-muted-foreground">Base 路径</dt>
            <dd className="font-mono text-xs break-all">{config.basePath}</dd>
            <dt className="text-muted-foreground">平台</dt>
            <dd><Badge variant="secondary">{config.platform}</Badge></dd>
            <dt className="text-muted-foreground">版本</dt>
            <dd>{config.version}</dd>
            <dt className="text-muted-foreground">调试级别</dt>
            <dd><Badge variant={config.debugLevel === 'debug' ? 'default' : 'outline'}>{config.debugLevel}</Badge></dd>
            <dt className="text-muted-foreground">操作系统</dt>
            <dd>{config.os}</dd>
          </dl>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">尚未配置 Workspace</p>
            <p className="text-xs text-muted-foreground">当前路径: {path}</p>
            <Link to="/config" className="text-sm text-primary hover:underline">前往配置</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
