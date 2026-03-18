import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { deviceSchema, type DeviceConfig } from '@sydev/core/schemas/device-schema.js';

/** 从 workspace 配置加载已配置的设备 */
export function loadDevices(workspaceRoot: string): DeviceConfig[] {
  const devices: DeviceConfig[] = [];
  const deviceMap = new Map<string, DeviceConfig>();

  // 首先尝试读取 .realevo/devicelist.json（RealEvo-Stream 的设备列表）
  try {
    const devicelistPath = join(workspaceRoot, '.realevo', 'devicelist.json');
    if (existsSync(devicelistPath)) {
      const content = readFileSync(devicelistPath, 'utf-8');
      const devicelistData = JSON.parse(content);

      // devicelist.json 的格式：{ devices: [...] }
      const deviceList = devicelistData.devices || [];
      for (const device of deviceList) {
        try {
          // 将 RealEvo-Stream 格式转换为 DeviceConfig 格式
          // 注意：平台可能是字符串或数组，需要转换为数组
          const platforms = Array.isArray(device.platform)
            ? device.platform
            : (device.platform ? device.platform.split(/[:,]/).map((p: string) => p.trim()) : ['ARM64_GENERIC']);

          const deviceConfig: DeviceConfig = {
            name: device.name,
            ip: device.ip,
            platform: platforms,
            ssh: device.ssh ? parseInt(String(device.ssh), 10) : 22,
            telnet: device.telnet ? parseInt(String(device.telnet), 10) : 23,
            ftp: device.ftp ? parseInt(String(device.ftp), 10) : 21,
            gdb: device.gdb ? parseInt(String(device.gdb), 10) : 1234,
            username: device.username || device.user || 'root',
            password: device.password,
          };

          // 验证设备配置
          const parsed = deviceSchema.safeParse(deviceConfig);
          if (parsed.success) {
            deviceMap.set(device.name, parsed.data);
          }
        } catch {
          // 单个设备解析失败，继续下一个
        }
      }
    }
  } catch (err) {
    // devicelist.json 读取失败，继续尝试 config.json
  }

  // 如果 devicelist.json 为空，再读取 .realevo/config.json 中的设备信息
  if (deviceMap.size === 0) {
    try {
      const configPath = join(workspaceRoot, '.realevo', 'config.json');
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        if (config.devices && Array.isArray(config.devices)) {
          for (const device of config.devices) {
            const parsed = deviceSchema.safeParse(device);
            if (parsed.success) {
              deviceMap.set(device.name, parsed.data);
            }
          }
        }
      }
    } catch (err) {
      // 静默失败，返回空设备列表
    }
  }

  // 转换为数组并返回
  for (const device of deviceMap.values()) {
    devices.push(device);
  }

  return devices;
}
