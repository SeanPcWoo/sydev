import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TemplateImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: { name: string; description: string; type: string; data: unknown }) => void;
}

interface ParsedTemplate {
  type: string;
  data: unknown;
}

export function TemplateImport({ open, onClose, onImport }: TemplateImportProps) {
  const [parsed, setParsed] = useState<ParsedTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setParsed(null);
    setName('');
    setDescription('');
    setError('');
    setDragging(false);
  }, []);

  function handleFile(file: File) {
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (!json.type || json.data === undefined) {
          setError('JSON 格式不正确，需要包含 type 和 data 字段');
          return;
        }
        setParsed({ type: json.type, data: json.data });
        setName(json.meta?.name || file.name.replace(/\.json$/, ''));
      } catch {
        setError('文件不是有效的 JSON');
      }
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    if (!parsed || !name.trim()) return;
    onImport({ name: name.trim(), description: description.trim(), type: parsed.type, data: parsed.data });
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导入模板</DialogTitle>
          <DialogDescription>上传 JSON 文件导入模板配置</DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            aria-label="点击或拖拽上传 JSON 文件"
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">拖拽 JSON 文件到此处，或点击选择文件</p>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">类型:</span>
              <Badge variant="outline">{parsed.type}</Badge>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-name">名称</Label>
              <Input id="import-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="模板名称" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-desc">描述</Label>
              <Input id="import-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="模板描述（可选）" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { reset(); }}>重新选择文件</Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button onClick={handleImport} disabled={!parsed || !name.trim()}>导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
