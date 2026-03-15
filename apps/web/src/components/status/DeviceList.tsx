import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface DeviceListProps {
  devices: DeviceConfig[];
}

export function DeviceList({ devices }: DeviceListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Monitor className="h-5 w-5" />
          设备列表
          {devices.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{devices.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {devices.length > 0 ? (
          <ul className="space-y-3">
            {devices.map((d) => (
              <li key={d.name} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.ip} &middot; SSH:{d.ssh} &middot; {d.username}
                  </span>
                </div>
                <Badge variant="outline">{d.platform}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Monitor className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无设备</p>
            <Link to="/config" className="text-sm text-primary hover:underline">前往配置</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
