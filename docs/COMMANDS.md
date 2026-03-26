# sydev 命令参考

本文档覆盖当前 CLI 中所有主命令和子命令，内容以 `apps/cli/src/commands/` 的实现为准。

## 总览

| 命令 | 子命令 / 形式 | 说明 |
| --- | --- | --- |
| `workspace` | `init`, `status` | 初始化 workspace 或检查状态 |
| `project` | `create`, `list` | 创建项目或列出项目 |
| `device` | `add`, `list` | 添加设备或列出设备 |
| `build` | `[project]`, `init` | 编译项目 / 构建模板，或生成 Makefile |
| `clean` | `[project]` | 清理项目 |
| `rebuild` | `[project]` | 重新编译项目 |
| `upload` | `[projects]` | 上传单个、多个或全部项目 |
| `template` | `create`, `list`, `show`, `apply`, `delete`, `export`, `import` | 管理配置模板 |
| `init` | `--config <file>` | 从完整配置文件初始化 |

## 通用规则

### 当前目录通常就是 workspace 根目录

以下命令默认把当前目录视为 workspace 根目录：

- `project list`
- `build`
- `clean`
- `rebuild`
- `upload`
- `template export`

### 交互模式与非交互模式

- `workspace init`、`project create`、`device add` 在未提供参数时进入交互模式
- 只要传了任意业务参数，或只传了 `--config`，就会进入非交互模式
- 对这三类命令，命令行参数优先级高于 JSON 配置文件

### 透传构建参数

`build`、`clean`、`rebuild` 都支持通过 `-- <args>` 继续透传参数。

常见场景：

```bash
sydev build libcpu -- --parallel=4
sydev rebuild libcpu -- --parallel=8
sydev build base -- -j4
```

兼容说明：

- `build` / `rebuild` 中常见的 `-j4`、`--jobs=4` 会自动转换成 `rl-build build --parallel=4`
- `clean` 的透传参数会原样附加到 `rl-build clean`
- `base` 目标不走 `rl-build`，而是在 base 目录执行 `make`，因此会保留原始参数，例如 `-j4`

### 项目识别规则

当前代码会把“workspace 一级子目录同时包含 `.project` 和 `Makefile`”视为一个项目。

### 两套模板概念不同

- `sydev build __demo` 执行的是 `.sydev/Makefile` 里的构建模板
- `sydev template ...` 管理的是配置模板，存放在 `~/.sydev/templates/`

## workspace

### `sydev workspace init`

初始化 workspace，支持交互式和非交互式。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `--cwd <path>` | workspace 路径 |
| `--base-path <path>` | Base 目录路径 |
| `--version <version>` | `default` / `ecs_3.6.5` / `lts_3.6.5` / `lts_3.6.5_compiled` / `research` / `custom` |
| `--platforms <platforms>` | 目标平台，逗号分隔 |
| `--os <os>` | `sylixos` 或 `linux` |
| `--debug-level <level>` | `release` 或 `debug` |
| `--arm64-page-shift <shift>` | ARM64 页偏移，支持 `12`/`14`/`16` |
| `--base-components <components>` | Base 编译组件，逗号分隔，例如 `libsylixos,openssl` |
| `--custom-repo <repo>` | `version=custom` 时需要 |
| `--custom-branch <branch>` | `version=custom` 时需要 |
| `--research-branch <branch>` | `version=research` 时需要 |
| `--create-base` | 创建新 Base，默认开启 |
| `--no-create-base` | 不创建 Base |
| `--build` | 初始化后编译 Base，默认关闭 |
| `--config <file>` | 读取 JSON 配置文件 |

#### 行为说明

- 交互模式下会提示输入 workspace 路径、Base 路径、版本、平台、OS、调试级别等
- 非交互模式下，命令行参数会覆盖 JSON 配置文件中的同名字段
- `version=custom` 时需要额外提供 `customRepo` 和 `customBranch`
- `version=research` 时需要额外提供 `researchBranch`
- 选择 ARM64 平台时可额外指定 `--arm64-page-shift`，其中 `12`=4K、`14`=16K、`16`=64K
- 选择 `--base-components` 时，会在 base 构造完成后修改 `base/Makefile` 里的 `COMPONENTS` 变量，只保留选中的组件，未选中的组件会被注释保留
- 交互模式下会像平台一样以多选列表列出默认 base 组件；其中 `libsylixos` 会固定勾选且不可取消
- 非交互模式同样支持这两个功能：`workspace init` 可直接传 `--arm64-page-shift` / `--base-components`，也可放进 `--config` JSON；`sydev init --config` 和 `template apply <json> -y` 使用的是 `workspace.arm64PageShift` / `workspace.baseComponents`
- 即使指定了 `--build`，`rl-workspace` 阶段也会固定使用不编译模式；只有在 base 构造完成后，才会单独进入 base 目录执行 `make all`
- base 的 `make all` 当前不设置超时；`rl-workspace` 等其它命令仍保留各自的超时控制
- 如果用户选择了编译，且 `rl-workspace` 返回失败，只要 base 已构造出来，仍会继续尝试执行 `make all`

#### 示例

```bash
sydev workspace init
sydev workspace init --config workspace.json
sydev workspace init --cwd /ws --base-path /ws/.realevo/base --version lts_3.6.5 --platforms ARM64_GENERIC,X86_64 --os sylixos --debug-level release --arm64-page-shift 14 --base-components libsylixos,openssl --create-base --build
sydev workspace init --config workspace.json --platforms X86_64
```

配置文件格式见 [CONFIG_FILES.md](./CONFIG_FILES.md#workspace-init)。

### `sydev workspace status`

检查当前目录是否已初始化为 workspace。

#### 行为说明

- 若当前目录下存在 `.realevo/`，显示已初始化
- 否则提示运行 `sydev workspace init`

#### 示例

```bash
sydev workspace status
```

## project

### `sydev project create`

创建项目，支持两种模式：

- `import`：导入已有 Git 仓库
- `create`：新建工程模板

#### 选项

| 选项 | 说明 |
| --- | --- |
| `--mode <mode>` | `import` 或 `create` |
| `--name <name>` | 项目名称 |
| `--source <url>` | Git 仓库地址，`mode=import` 时需要 |
| `--branch <branch>` | Git 分支，`mode=import` 时需要 |
| `--template <template>` | `app` / `lib` / `common` / `ko` / `python_native_lib` / `uorb_pubsub` / `vsoa_pubsub` / `fast_dds_pubsub` |
| `--type <type>` | `cmake` / `automake` / `realevo` / `ros2` / `python` / `cython` / `go` / `javascript` |
| `--debug-level <level>` | `release` 或 `debug` |
| `--make-tool <tool>` | `make` 或 `ninja` |
| `--config <file>` | 读取 JSON 配置文件 |

#### 行为说明

- `mode=import` 需要 `source` 和 `branch`
- `mode=create` 需要 `template` 和 `type`
- 交互模式下会根据所选模式提示不同字段
- 非交互模式下，命令行参数覆盖 JSON 配置文件

#### 示例

```bash
sydev project create
sydev project create --mode import --name my-proj --source https://github.com/example/repo.git --branch main --make-tool make
sydev project create --mode create --name my-proj --template app --type cmake --debug-level release --make-tool ninja
sydev project create --config project.json
```

配置文件格式见 [CONFIG_FILES.md](./CONFIG_FILES.md#project-create)。

### `sydev project list`

列出当前 workspace 下识别到的项目。

#### 行为说明

- 当前实现基于 `WorkspaceScanner`
- 只扫描 workspace 一级子目录
- 目录需同时包含 `.project` 和 `Makefile`

#### 示例

```bash
sydev project list
```

## device

### `sydev device add`

添加目标设备，支持交互式和非交互式。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `--name <name>` | 设备名称 |
| `--ip <ip>` | IPv4 地址 |
| `--platforms <platforms>` | 支持的平台，逗号分隔 |
| `--username <username>` | 登录用户名 |
| `--password <password>` | 登录密码 |
| `--ssh <port>` | SSH 端口，默认 `22` |
| `--telnet <port>` | Telnet 端口，默认 `23` |
| `--ftp <port>` | FTP 端口，默认 `21` |
| `--gdb <port>` | GDB 端口，默认 `1234` |
| `--config <file>` | 读取 JSON 配置文件 |

#### 行为说明

- 交互模式默认用户名和密码为 `root`
- 非交互模式下，命令行参数覆盖 JSON 配置文件
- 设备名称、IP、平台和端口都会做基本校验

#### 示例

```bash
sydev device add
sydev device add --name board1 --ip 192.168.1.100 --platforms ARM64_GENERIC --username root --password root --ftp 21
sydev device add --config device.json
```

配置文件格式见 [CONFIG_FILES.md](./CONFIG_FILES.md#device-add)。

### `sydev device list`

列出当前 workspace 可见的设备。

#### 行为说明

- 先读 `.realevo/devicelist.json`
- 若为空或不存在，再回退到 `.realevo/config.json`
- 输出是面向人阅读的文本，不是 JSON

#### 示例

```bash
sydev device list
```

## build

### `sydev build [project]`

编译单个项目，或在无参数时交互式选择多个项目/构建模板。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `[project]` | 项目名，或 `.sydev/Makefile` 中的用户构建模板名 |
| `--quiet` | 静默模式，不实时透传构建输出 |
| `-- <args>` | 普通工程透传给 `rl-build build`，`base` 透传给 base 目录下的 `make all` |

#### 行为说明

- 无参数时会弹出多选框
- 交互模式里除了项目，还会列出 `.sydev/Makefile` 中可识别的用户构建模板
- 指定 `project` 参数时，先按项目名匹配，找不到再按构建模板名匹配
- `project=base` 时会在 base 目录执行 `make all`
- 执行前会把目标工程 `config.mk` 里的 `SYLIXOS_BASE_PATH` 同步为当前 workspace 的 base 路径
- 当前没有 `--all` 选项

#### 示例

```bash
sydev build
sydev build base
sydev build libcpu
sydev build __demo
sydev build libcpu --quiet
sydev build libcpu -- --parallel=4
sydev build base -- -j4
sydev build libcpu -- -j4
```

### `sydev build init`

生成或更新 `.sydev/Makefile`，让你可以脱离 sydev 直接使用 `make -f .sydev/Makefile <target>`。其中 `base` target 在 base 目录执行 `make`，其它工程 target 内部调用 `rl-build`。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `--default` | 从头重新生成 Makefile，会覆盖用户修改 |

#### 示例

```bash
sydev build init
sydev build init --default
make -f .sydev/Makefile libcpu
make -f .sydev/Makefile libcpu RL_BUILD_ARGS='--parallel=4'
make -f .sydev/Makefile base BASE_BUILD_ARGS='-j4'
```

## clean

### `sydev clean [project]`

清理单个项目，或交互式选择多个项目。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `[project]` | 项目名 |
| `--quiet` | 静默模式，不实时透传命令输出 |
| `-- <args>` | 普通工程透传给 `rl-build clean`，`base` 透传给 base 目录下的 `make clean` |

#### 行为说明

- 无参数时弹出项目多选
- `project=base` 时会在 base 目录执行 `make clean`
- 执行前会把目标工程 `config.mk` 里的 `SYLIXOS_BASE_PATH` 同步为当前 workspace 的 base 路径
- 当前没有 `--all`

#### 示例

```bash
sydev clean
sydev clean base
sydev clean libcpu
```

## rebuild

### `sydev rebuild [project]`

对项目执行 clean + build。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `[project]` | 项目名 |
| `--quiet` | 静默模式，不实时透传构建输出 |
| `-- <args>` | 普通工程透传给 `rl-build build`，`base` 透传给 base 目录下的 `make` |

#### 行为说明

- 无参数时弹出项目多选
- `project=base` 时会在 base 目录执行 `make clean && make all`
- 执行前会把目标工程 `config.mk` 里的 `SYLIXOS_BASE_PATH` 同步为当前 workspace 的 base 路径
- 当前没有 `--all`

#### 示例

```bash
sydev rebuild
sydev rebuild base
sydev rebuild libcpu
sydev rebuild libcpu -- --parallel=4
sydev rebuild base -- -j4
sydev rebuild libcpu -- -j4
```

## upload

### `sydev upload [projects]`

上传编译产物到设备。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `[projects]` | 单个项目名，或多个项目名列表，支持逗号和冒号分隔 |
| `--device <name>` | 指定目标设备 |
| `--all` | 上传当前 workspace 中的全部项目 |
| `--quiet` | 静默模式 |

#### 行为说明

- 无参数且不带 `--all` 时：交互式多选项目，再选择设备
- 单项目上传时：若未指定 `--device`，会尝试读取该项目 `.reproject` 中的默认设备
- 多项目上传时：必须显式指定 `--device`
- `--all` 时：必须显式指定 `--device`
- 若 base 工程可检测到且其目录下存在 `.reproject`，它会作为 `base` 项目加入候选列表

#### 示例

```bash
sydev upload
sydev upload libcpu
sydev upload libcpu --device board1
sydev upload libcpu,libnet --device board1
sydev upload libcpu:libnet:libfs --device board1
sydev upload base --device board1
sydev upload --all --device board1
```

更详细的上传说明见 [UPLOAD_GUIDE.md](./UPLOAD_GUIDE.md)。

## template

`sydev template` 管理的是配置模板，不是 `.sydev/Makefile` 里的构建模板。

模板存储位置：

```text
~/.sydev/templates/
```

### 模板类型

| 类型 | 说明 |
| --- | --- |
| `workspace` | 只包含 workspace 配置 |
| `project` | 只包含单个项目配置 |
| `device` | 只包含单个设备配置 |
| `full` | 包含 workspace，以及可选的 projects / devices |

### `sydev template create`

交互式创建模板并保存到全局模板库。

#### 行为说明

- 会提示输入模板名称、描述、类型
- 模板 ID 会自动 slugify，规则为：转小写、空格/下划线转 `-`、去掉无效字符
- 若模板已存在，可选择覆盖、重命名或取消

#### 示例

```bash
sydev template create
```

### `sydev template list`

列出模板，可按类型过滤。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `-t, --type <type>` | `workspace` / `project` / `device` / `full` |

#### 示例

```bash
sydev template list
sydev template list --type full
```

### `sydev template show <id>`

查看模板详情。

#### 示例

```bash
sydev template show my-template
```

### `sydev template apply <source>`

从模板 ID 或 JSON 文件应用配置，初始化环境。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `<source>` | 模板 ID，或 JSON 文件路径 |
| `--cwd <path>` | workspace 路径 |
| `--base-path <path>` | Base 路径 |
| `-y, --yes` | 跳过所有交互提示，full 模板默认全选，步骤失败时自动继续 |

#### 行为说明

- `<source>` 解析规则：
  - 以 `.json` 结尾，或文件实际存在时，按 JSON 文件处理
  - 否则按模板 ID 从 `~/.sydev/templates` 加载
- 若未提供 `--cwd`：
  - 非 `-y` 模式会提示输入
  - `-y` 模式使用 `process.cwd()`
- 若未提供 `--base-path`：
  - 非 `-y` 模式会提示输入
  - `-y` 模式使用 `${cwd}/.realevo/base`
- `full` 模板在交互模式下可选择只应用部分内容
- `workspace` 和 `full` 模板会初始化 workspace
- `project` 和 `device` 模板会在已有 workspace 中直接执行，对应要求目标目录下存在 `.realevo/`
- `project` 和 `device` 模板只需要 `--cwd`，不会使用 `--base-path`
- 无论 JSON 文件里是否已经带 `workspace.cwd` / `workspace.basePath`，`apply` 都会用当前命令解析出的路径覆盖

#### 示例

```bash
sydev template apply my-template
sydev template apply config.json
sydev template apply config.json --cwd /path/to/ws --base-path /path/to/base -y
sydev template apply my-template --cwd /path/to/ws
```

JSON 文件格式见 [CONFIG_FILES.md](./CONFIG_FILES.md#template-import-与-template-apply-支持的文件格式)。

### `sydev template delete <id>`

删除模板，需要确认。

#### 示例

```bash
sydev template delete my-template
```

### `sydev template export`

从当前 workspace 扫描配置并导出为 JSON 文件。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `-o, --output <file>` | 输出文件路径，默认 `sydev-config.json` |
| `-d, --dir <path>` | 要扫描的 workspace 路径，默认当前目录 |

#### 行为说明

- 优先读取 `.realevo/workspace.json`，回退到 `.realevo/config.json`
- 扫描当前 workspace 一级子目录中的项目
- 自动尝试从 Git 获取 `source` 和 `branch`
- 加载设备列表
- 导出的文件是“原始 full 配置”，默认不带顶层 `type`
- 导出后可选择同时保存为全局模板

#### 示例

```bash
sydev template export
sydev template export --output sydev-config.json
sydev template export --dir /path/to/ws
```

导出文件格式见 [CONFIG_FILES.md](./CONFIG_FILES.md#template-export-输出格式)。

### `sydev template import <file>`

从 JSON 文件导入模板配置。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `<file>` | JSON 文件 |
| `-y, --yes` | 跳过交互提示，不保存为模板 |

#### 行为说明

- 自动识别 `workspace` / `project` / `device` / `full`
- 若不带 `-y`，会询问是否保存为模板
- 允许导入 `template export` 生成的原始 full 配置

#### 示例

```bash
sydev template import config.json
sydev template import config.json -y
```

## init

### `sydev init --config <file>`

从完整 JSON 配置文件一次性执行 workspace 初始化、项目创建、设备添加。

#### 选项

| 选项 | 说明 |
| --- | --- |
| `--config <file>` | 完整配置文件路径 |

#### 行为说明

- 只支持通过配置文件启动
- 接受原始 full 配置，或 `{ "type": "full", "data": { ... } }`
- 若配置里未提供 `workspace.cwd` 或 `workspace.basePath`，命令会在执行前提示输入
- 项目和设备按顺序执行

#### 示例

```bash
sydev init --config full-config.json
```

配置文件格式见 [CONFIG_FILES.md](./CONFIG_FILES.md#sydev-init)。
