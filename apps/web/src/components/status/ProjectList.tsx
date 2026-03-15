import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProjectConfig {
  name: string;
  template?: string;
  type?: string;
  source?: string;
  branch?: string;
  debugLevel?: string;
  makeTool: string;
}

interface ProjectListProps {
  projects: ProjectConfig[];
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Code2 className="h-5 w-5" />
          项目列表
          {projects.length > 0 && (
            <Badge variant="secondary" className="ml-auto">{projects.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.name} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.makeTool}{p.type ? ` / ${p.type}` : ''}
                  </span>
                </div>
                {p.template && <Badge variant="outline">{p.template}</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Code2 className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无项目</p>
            <Link to="/config" className="text-sm text-primary hover:underline">前往配置</Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
