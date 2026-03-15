import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusPage } from '@/pages/StatusPage';
import { TemplatePage } from '@/pages/TemplatePage';
import { ConfigPage } from '@/pages/ConfigPage';

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
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/templates" element={<TemplatePage />} />
          <Route path="/batch" element={<PlaceholderPage title="批量操作" description="批量创建项目和设备" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
