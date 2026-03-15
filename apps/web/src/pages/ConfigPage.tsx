import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WorkspaceForm } from '@/components/config/WorkspaceForm';
import { ProjectForm } from '@/components/config/ProjectForm';
import { DeviceForm } from '@/components/config/DeviceForm';

export function ConfigPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">环境配置</h1>
      <Card>
        <CardHeader>
          <CardTitle>配置管理</CardTitle>
          <CardDescription>配置 Workspace、项目和设备参数</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="workspace">
            <TabsList>
              <TabsTrigger value="workspace">Workspace 配置</TabsTrigger>
              <TabsTrigger value="project">Project 配置</TabsTrigger>
              <TabsTrigger value="device">Device 配置</TabsTrigger>
            </TabsList>
            <TabsContent value="workspace" className="pt-4">
              <WorkspaceForm />
            </TabsContent>
            <TabsContent value="project" className="pt-4">
              <ProjectForm />
            </TabsContent>
            <TabsContent value="device" className="pt-4">
              <DeviceForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
