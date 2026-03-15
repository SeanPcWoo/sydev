import { z } from 'zod';
import { workspaceSchema } from './workspace-schema.js';
import { projectSchema } from './project-schema.js';
import { deviceSchema } from './device-schema.js';

export const fullConfigSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  workspace: workspaceSchema,
  projects: z.array(projectSchema).optional(),
  devices: z.array(deviceSchema).optional(),
});

export type FullConfig = z.infer<typeof fullConfigSchema>;
