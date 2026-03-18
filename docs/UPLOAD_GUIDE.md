# sydev upload 详细使用指南

`sydev upload` 命令用于通过 FTP 将编译产物上传到目标设备。本指南详细说明如何配置和使用上传功能。

## 目录

- [快速开始](#快速开始)
- [配置文件格式](#配置文件格式)
- [.reproject 配置](#reproject-配置)
- [config.mk 配置](#configmk-配置)
- [路径变量替换](#路径变量替换)
- [使用示例](#使用示例)
- [故障排除](#故障排除)

---

## 快速开始

### 1. 配置目标设备

```bash
sydev device add
```

交互式输入：
- 设备名称：`board1`
- IP 地址：`192.168.1.100`
- 平台：`ARM64_A53`
- FTP 端口：`21` (默认)
- 用户名：`root`
- 密码：(可选)

### 2. 配置工程上传路径

在工程目录下创建 `.reproject` 文件：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <device>board1</device>
  <upload>
    <file local="$(WORKSPACE_libcpu)\$(Output)\libcpu.so"
          remote="/system/lib/libcpu.so"/>
  </upload>
</project>
```

### 3. 上传工程

```bash
# 交互式选择工程和设备
sydev upload

# 或指定工程和设备
sydev upload libcpu --device board1
```

---

## 配置文件格式

### .reproject XML 结构

`.reproject` 文件定义了如何上传工程产物，应放在工程根目录。

#### 完整格式

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <!-- 可选：指定默认上传设备 -->
  <device>board1</device>

  <!-- 定义上传文件列表 -->
  <upload>
    <!-- 每个 file 标签定义一个上传规则 -->
    <file local="$(WORKSPACE_libcpu)\$(Output)\libcpu.so"
          remote="/system/lib/libcpu.so"/>

    <file local="$(WORKSPACE_libcpu)\$(Output)\libcpu.a"
          remote="/system/lib/libcpu.a"/>

    <!-- 支持目录上传 -->
    <file local="$(WORKSPACE_libnet)\$(Output)\include"
          remote="/system/include/libnet"/>
  </upload>
</project>
```

#### 属性说明

| 属性 | 说明 | 示例 |
|------|------|------|
| `<device>` | 默认上传设备（可被 CLI `--device` 覆盖） | `board1` |
| `<file local>` | 本地源文件路径（支持变量） | `$(WORKSPACE_libcpu)\$(Output)\libcpu.so` |
| `<file remote>` | 远端目标路径 | `/system/lib/libcpu.so` |

---

## config.mk 配置

### DEBUG_LEVEL 设置

`sydev upload` 会自动从工程的 `config.mk` 读取 `DEBUG_LEVEL` 来确定输出目录名。

```makefile
# config.mk
DEBUG_LEVEL = debug    # 对应 Debug 目录
# 或
DEBUG_LEVEL = release  # 对应 Release 目录
```

#### 自动映射

- `DEBUG_LEVEL = debug` → `$(Output)` 替换为 `Debug`
- `DEBUG_LEVEL = release` → `$(Output)` 替换为 `Release`
- 默认值：`Release`（如果 config.mk 不存在或不包含该变量）

---

## 路径变量替换

### 支持的变量

#### 1. WORKSPACE_<project> 变量

工程路径变量自动从工作空间生成。

```
$(WORKSPACE_libcpu)      → /path/to/workspace/libcpu
$(WORKSPACE_libnet)      → /path/to/workspace/libnet
$(WORKSPACE_lts)         → /path/to/workspace/lts
```

**规则**：
- 工程名中的 `-` (连字符) 转换为 `_` (下划线)
- 例如：`my-lib` → `$(WORKSPACE_my_lib)`

#### 2. $(Output) 变量

根据 `config.mk` 中的 `DEBUG_LEVEL` 自动替换。

```
$(Output)  →  Debug      (if DEBUG_LEVEL = debug)
$(Output)  →  Release    (if DEBUG_LEVEL = release)
```

#### 3. Base 工程特殊处理

对于包含 `libsylixos` 关键字的路径，自动使用 base 路径替换 `$(WORKSPACE_xxx)`：

```
原始路径：$(WORKSPACE_lts)\libsylixos\$(Output)\libvpmpdm.so
Base 路径：/path/to/sylixos-base
替换后：/path/to/sylixos-base/libsylixos/Release/libvpmpdm.so
```

### 完整替换示例

原始配置：

```xml
<file local="$(WORKSPACE_libcpu)\$(Output)\lib\libcpu.so"
      remote="/system/lib/libcpu.so"/>
```

替换过程（假设工程在 `/workspace/libcpu`，DEBUG_LEVEL=debug）：

```
1. $(WORKSPACE_libcpu) → /workspace/libcpu
2. $(Output) → Debug
3. 最终路径：/workspace/libcpu/Debug/lib/libcpu.so
```

---

## 使用示例

### 示例 1：单工程上传

```bash
# 交互式上传
sydev upload

# 选择工程：libcpu
# 选择设备：board1
# 结果：自动上传 libcpu 的产物
```

### 示例 2：多工程批量上传

```bash
# 使用逗号分隔
sydev upload libcpu,libnet --device board1

# 或使用冒号分隔
sydev upload libcpu:libnet:libfs --device dev1

# 上传全部工程
sydev upload --all --device board1
```

### 示例 3：上传 base 工程

Base 工程必须指定设备：

```bash
# 上传 base 工程
sydev upload base --device board1

# 同时上传 base 和其他工程
sydev upload base,libcpu,libnet --device board1
```

### 示例 4：静默模式

不显示文件上传进度：

```bash
sydev upload libcpu --device board1 --quiet
```

### 示例 5：完整的 .reproject 示例

对于一个复杂的工程，`.reproject` 可能如下：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <device>board1</device>
  <upload>
    <!-- 共享库 -->
    <file local="$(WORKSPACE_libcpu)\$(Output)\lib\libcpu.so"
          remote="/system/lib/libcpu.so"/>

    <!-- 静态库 -->
    <file local="$(WORKSPACE_libcpu)\$(Output)\lib\libcpu.a"
          remote="/usr/lib/libcpu.a"/>

    <!-- 头文件 -->
    <file local="$(WORKSPACE_libcpu)\$(Output)\include\cpu.h"
          remote="/usr/include/cpu.h"/>

    <!-- Base 工程的库 -->
    <file local="$(WORKSPACE_lts)\libsylixos\$(Output)\lib\libsylixos.so"
          remote="/system/lib/libsylixos.so"/>
  </upload>
</project>
```

---

## 工作流程

### 编译到上传的完整流程

```bash
# 1. 创建工作空间
sydev workspace init \
  --base /path/to/sylixos \
  --platform ARM64_A53

# 2. 添加工程
sydev workspace add libcpu
sydev workspace add libnet

# 3. 配置目标设备
sydev device add
# → 添加 board1: 192.168.1.100

# 4. 为每个工程配置 .reproject
# → libcpu/.reproject
# → libnet/.reproject

# 5. 编译工程
sydev build libcpu
sydev build libnet

# 6. 上传到设备
sydev upload libcpu,libnet --device board1

# 7. 验证上传成功
# → 连接到设备验证文件存在
```

---

## 故障排除

### 问题 1：找不到设备

**错误信息**：`设备 'board1' 未配置`

**解决方案**：
```bash
# 检查已配置的设备
sydev device list

# 如果设备不存在，添加它
sydev device add --name board1 --ip 192.168.1.100 --username root
```

### 问题 2：找不到 .reproject

**错误信息**：`未配置上传路径（检查 .reproject）`

**解决方案**：
```bash
# 在工程目录创建 .reproject
cd libcpu
cat > .reproject << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project>
  <device>board1</device>
  <upload>
    <file local="$(WORKSPACE_libcpu)\$(Output)\libcpu.so"
          remote="/system/lib/libcpu.so"/>
  </upload>
</project>
EOF
```

### 问题 3：本地文件不存在

**错误信息**：`文件不存在: /path/to/libcpu/Release/libcpu.so`

**解决方案**：
1. 确保工程已编译：`sydev build libcpu`
2. 检查 config.mk 中的 DEBUG_LEVEL 与实际编译配置一致
3. 检查 .reproject 中的本地路径是否正确

### 问题 4：FTP 连接失败

**错误信息**：`FTP 连接失败: ...`

**解决方案**：
1. 检查设备 IP 和 FTP 端口：`sydev device list`
2. 确认设备可访问：`ping 192.168.1.100`
3. 确认 FTP 服务运行：`telnet 192.168.1.100 21`
4. 检查用户名和密码是否正确

### 问题 5：base 工程上传失败

**错误信息**：`上传 base 工程必须指定 --device 参数`

**解决方案**：
```bash
# ✗ 错误：没有指定设备
sydev upload base

# ✓ 正确：指定设备
sydev upload base --device board1
```

---

## 最佳实践

1. **使用标准路径结构**
   ```
   $(WORKSPACE_<project>)\$(Output)\<artifact>
   ```

2. **在 .reproject 中指定默认设备**
   ```xml
   <device>board1</device>
   ```
   这样可以跳过 `--device` 参数（除了 base 工程）

3. **验证编译配置**
   确保 config.mk 中的 DEBUG_LEVEL 与实际编译方式一致

4. **批量上传时指定设备**
   ```bash
   sydev upload libcpu,libnet,libfs --device board1
   ```

5. **使用 --quiet 模式用于自动化脚本**
   ```bash
   sydev upload --all --device board1 --quiet
   ```

---

## API 集成

如果你正在开发 SylixOS IDE Skill，可以参考以下接口：

### UploadRunner 类

位置：`packages/core/src/upload-runner.ts`

```typescript
// 创建上传管理器
const runner = new UploadRunner(
  projects: ScannedProject[],
  workspaceRoot: string,
  devices: Map<string, DeviceConfig>
);

// 上传单个工程
const result = await runner.uploadOne(project, {
  device: 'board1',      // 设备名
  quiet: false           // 静默模式
});

// 结果包含：
// - name: 工程名
// - success: 是否成功
// - durationMs: 耗时（毫秒）
// - message: 状态消息
// - filesUploaded: 上传的文件数
// - device: 上传的设备名
```

### 监听上传进度

```typescript
runner.on('progress', (event) => {
  if (event.type === 'file-upload') {
    console.log(`Uploading: ${event.file} → ${event.remotePath}`);
  }
});
```

---

## 配置文件位置

工作空间中的关键配置文件：

```
workspace/
├── .realevo/
│   └── config.json          # 工作空间和设备配置
├── .sydev/
│   └── Makefile             # 自动生成的编译文件
├── libcpu/
│   ├── config.mk            # 编译配置（DEBUG_LEVEL）
│   ├── Makefile             # 工程 Makefile
│   ├── .project             # 工程描述
│   └── .reproject           # 上传配置（自定义）
└── libnet/
    ├── config.mk
    ├── Makefile
    ├── .project
    └── .reproject
```

---

## 相关命令

| 命令 | 说明 |
|------|------|
| `sydev device add` | 配置上传设备 |
| `sydev build` | 编译工程（产生 $(Output) 目录） |
| `sydev upload` | 上传产物 |
| `sydev workspace` | 管理工作空间 |

---

## 更多信息

- [完整命令参考](./COMMANDS.md)
- [API 参考](./API_REFERENCE.md)
