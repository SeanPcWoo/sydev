import { NavLink } from 'react-router-dom';
import { Settings, Activity, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/config', label: '配置', icon: Settings },
  { to: '/status', label: '状态', icon: Activity },
  { to: '/templates', label: '模板', icon: FileText },
  { to: '/batch', label: '批量操作', icon: Layers },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold">SyDev</span>
      </div>
      <nav className="flex-1 space-y-1 p-2" aria-label="主导航">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">SyDev v0.1.0</p>
      </div>
    </aside>
  );
}
