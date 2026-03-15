import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { templateContentSchema, templateIndexSchema } from './schemas/template-schema.js';

export type TemplateType = 'workspace' | 'project' | 'device' | 'full';

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateIndex {
  templates: TemplateMeta[];
}

export class TemplateManager {
  private templatesDir: string;
  private indexPath: string;

  constructor(baseDir: string) {
    this.templatesDir = join(baseDir, 'templates');
    this.indexPath = join(this.templatesDir, 'index.json');
  }

  static slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private ensureDir(): void {
    if (!existsSync(this.templatesDir)) {
      mkdirSync(this.templatesDir, { recursive: true });
    }
    if (!existsSync(this.indexPath)) {
      writeFileSync(this.indexPath, JSON.stringify({ templates: [] }, null, 2), 'utf-8');
    }
  }

  private readIndex(): TemplateIndex {
    this.ensureDir();
    const raw = readFileSync(this.indexPath, 'utf-8');
    return templateIndexSchema.parse(JSON.parse(raw));
  }

  private writeIndex(index: TemplateIndex): void {
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  save(name: string, description: string, type: TemplateType, content: unknown): TemplateMeta {
    this.ensureDir();
    const id = TemplateManager.slugify(name);
    if (!id) {
      throw new Error('模板名称无效，无法生成 ID');
    }

    // 验证内容
    const validated = templateContentSchema.parse({ type, data: content });

    const now = new Date().toISOString();
    const index = this.readIndex();
    const existing = index.templates.findIndex(t => t.id === id);

    const meta: TemplateMeta = {
      id,
      name,
      description,
      type,
      createdAt: existing >= 0 ? index.templates[existing].createdAt : now,
      updatedAt: now,
    };

    // 写入内容文件
    const contentPath = join(this.templatesDir, `${id}.json`);
    writeFileSync(contentPath, JSON.stringify(validated, null, 2), 'utf-8');

    // 更新索引
    if (existing >= 0) {
      index.templates[existing] = meta;
    } else {
      index.templates.push(meta);
    }
    this.writeIndex(index);

    return meta;
  }

  list(type?: TemplateType): TemplateMeta[] {
    const index = this.readIndex();
    let templates = index.templates;
    if (type) {
      templates = templates.filter(t => t.type === type);
    }
    return templates.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  load(id: string): { meta: TemplateMeta; content: unknown } {
    const index = this.readIndex();
    const metaIdx = index.templates.findIndex(t => t.id === id);

    if (metaIdx < 0) {
      throw new Error(`模板 "${id}" 不存在`);
    }

    const contentPath = join(this.templatesDir, `${id}.json`);
    if (!existsSync(contentPath)) {
      // 自动清理孤立索引条目
      index.templates.splice(metaIdx, 1);
      this.writeIndex(index);
      throw new Error(`模板 "${id}" 的内容文件丢失，已从索引中清理`);
    }

    const content = JSON.parse(readFileSync(contentPath, 'utf-8'));
    return { meta: index.templates[metaIdx], content };
  }

  delete(id: string): void {
    const index = this.readIndex();
    const metaIdx = index.templates.findIndex(t => t.id === id);

    if (metaIdx < 0) {
      throw new Error(`模板 "${id}" 不存在，无法删除`);
    }

    // 先删文件，再更新索引
    const contentPath = join(this.templatesDir, `${id}.json`);
    if (existsSync(contentPath)) {
      unlinkSync(contentPath);
    }

    index.templates.splice(metaIdx, 1);
    this.writeIndex(index);
  }

  exists(id: string): boolean {
    const index = this.readIndex();
    return index.templates.some(t => t.id === id);
  }
}