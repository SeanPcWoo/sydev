import { z } from 'zod';
import { workspaceSchema } from './workspace-schema.js';
import { projectSchema } from './project-schema.js';
import { deviceSchema } from './device-schema.js';
import { fullConfigSchema } from './full-config-schema.js';

export const templateTypeSchema = z.enum(['workspace', 'project', 'device', 'full']);

export const templateMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: templateTypeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const templateIndexSchema = z.object({
  templates: z.array(templateMetaSchema),
});

export const templateContentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('workspace'), data: workspaceSchema }),
  z.object({ type: z.literal('project'), data: projectSchema }),
  z.object({ type: z.literal('device'), data: deviceSchema }),
  z.object({ type: z.literal('full'), data: fullConfigSchema }),
]);
