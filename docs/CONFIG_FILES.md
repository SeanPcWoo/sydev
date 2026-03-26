# sydev 配置文件参考

本文档专门说明 `--config` 文件、`sydev init` 配置文件，以及 `template import` / `template apply` 支持的 JSON 结构。

## 先记住一个关键差异

### `workspace init --config` 使用的是“命令参数风格”

字段名示例：

- `platforms`
- `createBase`
- `debugLevel`
- `arm64PageShift`
- `baseComponents`

### `sydev init` 和 full 模板使用的是“完整配置风格”

字段名示例：

- `workspace.platform`
- `workspace.createbase`
- `workspace.debugLevel`

这两套字段名不完全相同，不要混用。

## 合并规则

以下命令遵循相同规则：

- `sydev workspace init --config ...`
- `sydev project create --config ...`
- `sydev device add --config ...`

优先级：

```text
命令行参数 > JSON 文件 > 命令默认值
```

## workspace init

### 命令

```bash
sydev workspace init --config workspace.json
```

### JSON 结构

```json
{
  "cwd": "/path/to/ws",
  "basePath": "/path/to/ws/.realevo/base",
  "version": "lts_3.6.5",
  "platforms": ["ARM64_GENERIC", "X86_64"],
  "os": "sylixos",
  "debugLevel": "release",
  "arm64PageShift": 14,
  "baseComponents": ["libsylixos", "openssl"],
  "createBase": true,
  "build": false
}
```

`arm64PageShift` 是可选字段，仅在选择 ARM64 平台时生效：

- `12` 表示 4K 页
- `14` 表示 16K 页
- `16` 表示 64K 页

`baseComponents` 也是可选字段，用来限制 base 的编译组件范围：

- 不填时表示按 base 默认 `COMPONENTS` 全量编译
- 填写后会在 base 构造完成后，改写 `base/Makefile` 里的 `COMPONENTS`
- 只保留选中的组件，未选中的默认组件会以注释形式保留在文件里
- `libsylixos` 必须保留
- 示例值：`["libsylixos", "openssl", "tcpdump"]`

这两个字段都支持非交互方式：

- `sydev workspace init --arm64-page-shift ... --base-components ...`
- `sydev workspace init --config workspace.json`
- `sydev init --config full-config.json`
- `sydev template apply config.json -y`

`build` 设为 `true` 时，实际行为是：

- 先用不编译模式构造 workspace/base
- 等 base 构造完成后，再单独进入 base 目录执行 `make all`
- 这个 base `make all` 当前不设置超时

### 可选附加字段

当 `version` 为特殊值时：

```json
{
  "version": "custom",
  "customRepo": "ssh://git@example.com/custom-base.git",
  "customBranch": "main"
}
```

```json
{
  "version": "research",
  "researchBranch": "dev/rk3568"
}
```

## project create

### 命令

```bash
sydev project create --config project.json
```

### 导入 Git 仓库模式

```json
{
  "mode": "import",
  "name": "my-proj",
  "source": "https://github.com/example/repo.git",
  "branch": "main",
  "makeTool": "make"
}
```

### 新建工程模式

```json
{
  "mode": "create",
  "name": "my-proj",
  "template": "app",
  "type": "cmake",
  "debugLevel": "release",
  "makeTool": "ninja"
}
```

## device add

### 命令

```bash
sydev device add --config device.json
```

### JSON 结构

```json
{
  "name": "board1",
  "ip": "192.168.1.100",
  "platforms": ["ARM64_GENERIC"],
  "username": "root",
  "password": "root",
  "ssh": 22,
  "telnet": 23,
  "ftp": 21,
  "gdb": 1234
}
```

## sydev init

### 命令

```bash
sydev init --config full-config.json
```

### JSON 结构

```json
{
  "schemaVersion": 1,
  "workspace": {
    "cwd": "/path/to/ws",
    "basePath": "/path/to/ws/.realevo/base",
    "platform": ["ARM64_GENERIC"],
    "version": "lts_3.6.5",
    "createbase": true,
    "build": false,
    "debugLevel": "release",
    "os": "sylixos",
    "arm64PageShift": 14,
    "baseComponents": ["libsylixos", "openssl"]
  },
  "projects": [
    {
      "name": "my-proj",
      "source": "https://github.com/example/repo.git",
      "branch": "main",
      "makeTool": "make"
    }
  ],
  "devices": [
    {
      "name": "board1",
      "ip": "192.168.1.100",
      "platform": ["ARM64_GENERIC"],
      "username": "root",
      "password": "root",
      "ssh": 22,
      "telnet": 23,
      "ftp": 21,
      "gdb": 1234
    }
  ]
}
```

### 额外说明

- 若 `workspace.cwd` 或 `workspace.basePath` 未提供，`sydev init` 会在执行前提示输入
- `workspace.platform` 是数组字段，不是 `platforms`
- `workspace.createbase` 是小写字段，不是 `createBase`
- `workspace.arm64PageShift` 仅在 ARM64 平台下可选，值只能是 `12`、`14`、`16`
- `workspace.baseComponents` 是字符串数组，用来指定 base `Makefile` 中要保留编译的组件
- `workspace.version = "custom"` 时，可在同级追加 `workspace.customRepo` 和 `workspace.customBranch`
- `workspace.version = "research"` 时，可在同级追加 `workspace.researchBranch`

## template import 与 template apply 支持的文件格式

### 1. 原始 full 配置

这也是 `template export` 的默认输出格式：

```json
{
  "schemaVersion": 1,
  "workspace": {
    "platform": ["ARM64_GENERIC"],
    "version": "lts_3.6.5",
    "createbase": true,
    "build": false,
    "debugLevel": "release",
    "os": "sylixos"
  },
  "projects": [],
  "devices": []
}
```

### 2. wrapped full 模板

```json
{
  "type": "full",
  "data": {
    "schemaVersion": 1,
    "workspace": {
      "platform": ["ARM64_GENERIC"],
      "version": "lts_3.6.5",
      "createbase": true,
      "build": false,
      "debugLevel": "release",
      "os": "sylixos",
      "arm64PageShift": 14,
      "baseComponents": ["libsylixos", "openssl"]
    }
  }
}
```

也支持：

```json
{
  "type": "full",
  "full": {
    "schemaVersion": 1,
    "workspace": {
      "platform": ["ARM64_GENERIC"],
      "version": "lts_3.6.5",
      "createbase": true,
      "build": false,
      "debugLevel": "release",
      "os": "sylixos",
      "arm64PageShift": 14,
      "baseComponents": ["libsylixos", "openssl"]
    }
  }
}
```

### 3. wrapped workspace / project / device 模板

```json
{
  "type": "workspace",
  "workspace": {
    "platform": ["ARM64_GENERIC"],
    "version": "lts_3.6.5",
    "createbase": true,
    "build": false,
    "debugLevel": "release",
    "os": "sylixos",
    "arm64PageShift": 14,
    "baseComponents": ["libsylixos", "openssl"]
  }
}
```

```json
{
  "type": "project",
  "project": {
    "name": "my-proj",
    "source": "https://github.com/example/repo.git",
    "branch": "main",
    "makeTool": "make"
  }
}
```

```json
{
  "type": "device",
  "device": {
    "name": "board1",
    "ip": "192.168.1.100",
    "platform": ["ARM64_GENERIC"],
    "username": "root",
    "ftp": 21,
    "ssh": 22,
    "telnet": 23,
    "gdb": 1234
  }
}
```

### apply 的特殊规则

`sydev template apply <source>` 在真正执行时总会重新决定：

- `workspace.cwd`
- `workspace.basePath`

来源规则：

- 命令行 `--cwd` / `--base-path`
- 交互输入
- `-y` 模式下的默认值

因此，即使 JSON 文件里本身带了 `cwd` / `basePath`，`apply` 也会用当前命令解析出的值覆盖。

补充说明：

- `workspace` / `full` 模板应用时会真正用到 `cwd` 和 `basePath`
- `project` / `device` 模板应用时只要求目标 `cwd` 已经是一个存在 `.realevo/` 的 workspace，`basePath` 不参与执行

## template export 输出格式

### 命令

```bash
sydev template export -o sydev-config.json
```

### 输出特征

- 顶层默认不带 `type`
- 默认输出的是“原始 full 配置”
- 可以直接被 `sydev init --config ...` 使用
- 也可以直接被 `sydev template import ...` 或 `sydev template apply ...` 使用

## 建议

- 要初始化整套环境时，优先使用 `sydev init --config full-config.json`
- 要保存和复用环境模板时，优先使用 `sydev template export` / `import` / `apply`
- 要做脚本化初始化单步命令时，使用 `workspace init --config`、`project create --config`、`device add --config`
