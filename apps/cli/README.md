# OpenSwitch CLI

SylixOS 开发环境快速部署工具 - 命令行界面

## 安装

```bash
pnpm install
pnpm build
npm link  # 全局安装
```

## 使用

### 基本命令

```bash
# 查看帮助
sydev --help

# 查看版本
sydev --version

# 初始化 workspace
sydev workspace init

# 创建项目
sydev project create

# 添加设备
sydev device add
```

### 命令自动补全

OpenSwitch 支持 Bash 和 Zsh 的命令自动补全。

#### 自动安装（推荐）

```bash
sydev completion install
```

该命令会自动检测当前 Shell 并安装补全脚本。

#### 手动安装

**Bash:**

```bash
# 系统级（需要 sudo）
sudo sydev completion bash > /etc/bash_completion.d/sydev

# 用户级
sydev completion bash >> ~/.bashrc
source ~/.bashrc
```

**Zsh:**

```bash
# 创建补全目录
mkdir -p ~/.zsh/completion

# 生成补全脚本
sydev completion zsh > ~/.zsh/completion/_sydev

# 添加到 .zshrc（如果尚未添加）
echo 'fpath=(~/.zsh/completion $fpath)' >> ~/.zshrc
echo 'autoload -U compinit && compinit' >> ~/.zshrc

# 重新加载配置
source ~/.zshrc
```

#### 验证补全

安装后，尝试输入以下内容并按 Tab 键：

```bash
sydev <Tab>          # 显示所有主命令
sydev workspace <Tab> # 显示 workspace 子命令
sydev project <Tab>   # 显示 project 子命令
```

## 开发

```bash
# 开发模式运行
pnpm dev <command>

# 构建
pnpm build

# 类型检查
pnpm exec tsc --noEmit
```

## 架构

- `src/index.ts` - CLI 主程序入口
- `src/commands/` - 命令定义（workspace, project, device, completion）
- `src/wizards/` - 交互式向导
- `src/utils/` - 工具函数（进度显示、帮助格式化）
- `src/completion/` - 自动补全脚本生成器

## 依赖

- **commander** - CLI 框架
- **inquirer** - 交互式提示
- **chalk** - 终端颜色输出
- **ora** - 进度 spinner
- **@sydev/core** - 核心业务逻辑（workspace 共享包）
