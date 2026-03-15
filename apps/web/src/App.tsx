import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusPage } from '@/pages/StatusPage';

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/config" replace />} />
          <Route path="/config" element={<PlaceholderPage title="配置" description="Workspace、项目和设备配置管理" />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/templates" element={<PlaceholderPage title="模板" description="模板管理与导入导出" />} />
          <Route path="/batch" element={<PlaceholderPage title="批量操作" description="批量创建项目和设备" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
