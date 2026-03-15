import { z } from 'zod';

export const deviceSchema = z.object({
  name: z.string().min(1),
  ip: z.string().ip({ version: 'v4', message: "必须是有效的 IPv4 地址" }),
  platform: z.string().min(1, "平台不能为空"),
  ssh: z.number().int().min(1).max(65535).default(22),
  telnet: z.number().int().min(1).max(65535).default(23),
  ftp: z.number().int().min(1).max(65535).default(21),
  gdb: z.number().int().min(1).max(65535).default(1234),
  username: z.string().min(1),
  password: z.string().optional()
});

export type DeviceConfig = z.infer<typeof deviceSchema>;
