import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface BatchItemStatus {
  name: string;
  type: 'project' | 'device';
  status: 'pending' | 'running' | 'success' | 'failed';
  error?: string;
}

interface BatchProgressListProps {
  items: BatchItemStatus[];
  onRetryFailed?: () => void;
}

const statusConfig = {
  pending: { icon: Clock, text: '等待中', color: 'text-muted-foreground' },
  running: { icon: Loader2, text: '执行中', color: 'text-blue-500' },
  success: { icon: CheckCircle2, text: '成功', color: 'text-green-500' },
  failed: { icon: XCircle, text: '失败', color: 'text-red-500' },
} as const;

export function BatchProgressList({ items, onRetryFailed }: BatchProgressListProps) {
  const total = items.length;
  const succeeded = items.filter((i) => i.status === 'success').length;
  const failed = items.filter((i) => i.status === 'failed').length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span>总计: {total}</span>
        <span className="text-green-500">成功: {succeeded}</span>
        <span className="text-red-500">失败: {failed}</span>
      </div>

      <ul className="space-y-2" role="list" aria-label="批量操作进度">
        {items.map((item) => {
          const cfg = statusConfig[item.status];
          const Icon = cfg.icon;
          return (
            <li key={`${item.type}-${item.name}`} className="flex items-center gap-3 rounded-md border p-3">
              <Icon className={`h-4 w-4 shrink-0 ${cfg.color} ${item.status === 'running' ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="font-medium">{item.name}</span>
              <Badge variant="secondary" className="text-xs">{item.type === 'project' ? '项目' : '设备'}</Badge>
              <span className={`text-sm ${cfg.color}`}>{cfg.text}</span>
              {item.error && <span className="ml-auto text-xs text-red-500 truncate max-w-[200px]" title={item.error}>{item.error}</span>}
            </li>
          );
        })}
      </ul>

      {failed > 0 && onRetryFailed && (
        <Button variant="outline" onClick={onRetryFailed}>重试失败项</Button>
      )}
    </div>
  );
}
