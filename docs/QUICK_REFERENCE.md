# sydev 快速参考卡片

## 常用命令

### 初始化

```bash
sydev workspace init
sydev workspace status
sydev project create
sydev device add
```

### 编译

```bash
sydev build
sydev build base
sydev build base -- -j8          # 并行编译 base（自动修补 jobserver）
sydev build libcpu
sydev build libcpu -- --parallel=4
sydev build __demo
sydev build init
sydev clean base
sydev clean libcpu
sydev rebuild base
sydev rebuild libcpu
```

### 上传

```bash
sydev upload
sydev upload libcpu
sydev upload libcpu --device board1
sydev upload libcpu,libnet --device board1
sydev upload --all --device board1
sydev upload base --device board1
```

### 模板与配置

```bash
sydev template create
sydev template list
sydev template show my-template
sydev template export -o sydev-config.json
sydev template import sydev-config.json
sydev template apply sydev-config.json --cwd /path/to/ws --base-path /path/to/base -y
sydev init --config full-config.json
```

### 帮助

```bash
sydev --help
sydev workspace init --help
sydev project create --help
sydev device add --help
sydev template apply --help
```

## 你最容易记错的点

- `build` / `clean` / `rebuild` 当前没有 `--all`
- `build` 可以执行 `.sydev/Makefile` 中的构建模板，如 `sydev build __demo`
- `.sydev/Makefile` 里 `base` target 使用 `make`，其它工程 target 调用 `rl-build`
- `build` / `clean` / `rebuild` 执行前会自动同步目标工程 `config.mk` 里的 `SYLIXOS_BASE_PATH`
- `sydev build base -- -j<N>` 会自动修补 base 的 `Makefile` 和 `multi-platform.mk`，让 jobserver 并行度能正确透传；`workspace init` 也会自动修补
- `workspace init` / `template apply` 可以通过 `baseComponents` 预先裁剪 base `Makefile` 的 `COMPONENTS`
- `template` 管理的是配置模板，不是构建模板
- `upload` 上传多个项目时必须显式传 `--device`
- `template apply` 的 `<source>` 可以是模板 ID，也可以是 JSON 文件路径
- `workspace init --config file.json`、`project create --config file.json`、`device add --config file.json` 都可以只靠配置文件运行

## 非交互常用写法

### workspace

```bash
sydev workspace init \
  --cwd /path/to/ws \
  --base-path /path/to/ws/.realevo/base \
  --version lts_3.6.5 \
  --platforms ARM64_GENERIC,X86_64 \
  --os sylixos \
  --debug-level release \
  --arm64-page-shift 14 \
  --base-components libsylixos,openssl \
  --create-base
```

### project

```bash
sydev project create \
  --mode import \
  --name my-proj \
  --source https://github.com/example/repo.git \
  --branch main \
  --make-tool make
```

### device

```bash
sydev device add \
  --name board1 \
  --ip 192.168.1.100 \
  --platforms ARM64_GENERIC \
  --username root \
  --password root
```

### template apply

```bash
sydev template apply env.json \
  --cwd /path/to/ws \
  --base-path /path/to/base \
  -y
```

## 典型工作流

### 新环境

```bash
sydev workspace init
sydev project create
sydev device add
sydev build
sydev upload
```

### 单项目开发

```bash
sydev build libcpu
sydev rebuild libcpu
sydev upload libcpu --device board1
```

### 配置导出与复用

```bash
sydev template export -o sydev-config.json
sydev template apply sydev-config.json --cwd /new/ws --base-path /new/base -y
```

## 常见文件位置

```text
workspace/
├── .realevo/workspace.json
├── .realevo/projects.json
├── .realevo/config.json
├── .realevo/devicelist.json
├── .sydev/Makefile
└── <project>/
    ├── .project
    ├── Makefile
    ├── config.mk
    └── .reproject
```

## 更多信息

- [完整命令参考](./COMMANDS.md)
- [配置文件参考](./CONFIG_FILES.md)
- [Upload 使用指南](./UPLOAD_GUIDE.md)
- [Skill / IDE 集成指南](./SKILL_INTEGRATION.md)
