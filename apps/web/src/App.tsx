import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { StatusPage } from '@/pages/StatusPage';
import { TemplatePage } from '@/pages/TemplatePage';
import { ConfigPage } from '@/pages/ConfigPage';
import { BatchPage } from '@/pages/BatchPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/config" replace />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/templates" element={<TemplatePage />} />
          <Route path="/batch" element={<BatchPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
