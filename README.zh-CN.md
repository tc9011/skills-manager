<div align="center">

# skills-manager

**将 AI 智能体技能备份并恢复到 GitHub。**

这是 [vercel-labs/skills](https://github.com/vercel-labs/skills) 的 CLI 配套工具 —— 将你的 `~/.agents/` 目录推送到远程仓库，在任意机器上拉取，并自动为所有智能体创建技能符号链接。

[![npm version](https://img.shields.io/npm/v/%40tc9011%2Fskills-manager?color=cb0000&label=npm)](https://www.npmjs.com/package/@tc9011/skills-manager)
[![CI](https://img.shields.io/github/actions/workflow/status/tc9011/skills-manager/ci.yml?label=CI)](https://github.com/tc9011/skills-manager/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

[English](./README.md) | 中文

</div>

---

## 为什么需要它

[vercel-labs/skills](https://github.com/vercel-labs/skills) 负责安装和管理技能，但不处理备份、恢复或跨机器同步。`skills-manager` 补上了这个缺口：

- **Push（推送）** — 提交并推送 `~/.agents/`（技能 + 锁定文件）到 GitHub
- **Pull（拉取）** — 在任意机器上克隆或拉取技能
- **Link（链接）** — 读取 `.skill-lock.json`，为每个使用的智能体创建符号链接
- **项目链接** — 将技能直接链接或复制到当前项目目录，用于本地开发

> **注意：** 本工具只读取 `.skill-lock.json`，从不修改它 —— 该文件由 `vercel-labs/skills` 管理。

## 安装

```bash
# 直接运行（无需安装）
npx @tc9011/skills-manager push

# 或全局安装
npm install -g @tc9011/skills-manager
```

> **提示：** 全局安装后，以下命令中可以使用 `sm`（或完整名称 `skills-manager`）代替 `npx @tc9011/skills-manager`。

**环境要求：** Node.js ≥ 20，推荐安装 [GitHub CLI](https://cli.github.com/)（`gh`）用于认证。

## 快速开始

```bash
# 1. 将技能备份到 GitHub
sm push

# 2. 在新机器上恢复
sm pull --repo owner/my-skills

# 3. 重新链接技能到智能体（pull 后自动执行）
sm link

# 4. 将技能链接到当前项目目录
sm link --project
```

首次运行时，如果 `~/.agents/` 还不是 git 仓库，`push` 和 `pull` 会交互式引导你完成 git 仓库和远程地址的设置。

## 命令

### `sm push`

将 `~/.agents/` 提交并推送到配置的 GitHub 远程仓库。

```bash
sm push
sm push -m "添加新的调试技能"
```

| 选项 | 说明 |
|------|------|
| `-m, --message <msg>` | 自定义提交信息（默认：自动生成） |

### `sm pull`

从 GitHub 拉取并自动执行 `link`。

```bash
sm pull --repo tc9011/my-skills
sm pull                          # 使用已有远程地址
sm pull --skip-link              # 仅拉取，不执行链接
```

| 选项 | 说明 |
|------|------|
| `-r, --repo <owner/name>` | 要拉取的 GitHub 仓库 |
| `--skip-link` | 拉取后跳过自动链接 |

### `sm link`

读取 `.skill-lock.json`，从每个智能体的技能目录到 `~/.agents/skills/` 创建相对符号链接。

```bash
sm link
sm link --agents cursor opencode claude-code
```

| 选项 | 说明 |
|------|------|
| `-a, --agents <ids...>` | 要链接的智能体 ID（指定后跳过交互提示） |
| `-p, --project` | 链接到项目目录（CWD）而非全局路径 |
| `-s, --skills <skills...>` | 要链接的技能名称（仅项目模式，跳过技能提示） |
| `--mode <mode>` | `copy` 或 `symlink`（仅项目模式，默认：`copy`，跳过提示） |

交互式多选提示允许你选择要链接的智能体。已有本地目录的智能体会被预选。你的选择会被记录以供下次使用。

指定 `--agents` 时，直接跳过智能体选择提示 —— 适合脚本和 AI 智能体自动化场景：

```bash
# 非交互式：将所有技能链接到指定智能体
sm link --agents cursor opencode
```

**符号链接模型：**

```
~/.config/opencode/skills/my-skill → ../../../.agents/skills/my-skill   (相对路径)
~/.claude/skills/my-skill          → ../../.agents/skills/my-skill      (相对路径)
```

**项目模式：**

使用 `--project`（或 `-p`）时，会依次经过三个交互提示：

1. **选择技能** — 选择要链接的技能（默认不预选）
2. **复制或符号链接** — 复制文件（默认，推荐）或创建绝对路径符号链接
3. **选择智能体** — 选择要配置项目级技能的智能体

通过命令行提供 `--skills`、`--mode` 和 `--agents` 可跳过所有提示：

```bash
# 完全非交互式的项目链接
sm link --project --agents cursor claude-code --skills my-skill --mode copy
```

`link --project` 后的项目目录结构示例：

```
./project/
├── .agents/skills/my-skill       ← 通用智能体共享（复制或符号链接）
├── .claude/skills/my-skill       ← claude-code 专属
├── .cursor/skills/my-skill       → ~/.agents/skills/my-skill（绝对路径符号链接）
└── .trae/skills/my-skill         ← trae 专属
```

- **技能选择：** 只复制/链接你选中的技能，无需包含全部。
- **去重：** 共享同一项目路径的智能体只触发一次复制/链接操作。
- **复制 vs 符号链接：** 复制会创建独立文件（推荐，便于移植）。符号链接使用绝对路径指向 `~/.agents/skills/`。

## 认证

认证是**可选的**。如果 git 已配置好凭证（SSH 密钥、macOS Keychain、`git credential-manager` 等），push 和 pull 无需额外设置即可工作。

当 git 凭证不可用时，CLI 按以下顺序查找 token：

1. **`gh auth token`** — GitHub CLI（推荐）
2. **`$GITHUB_TOKEN`** — 环境变量
3. **`$GH_TOKEN`** — 环境变量

如果都未找到，git 会尝试未认证操作 —— 公开仓库可以，私有仓库会失败。`link` 命令不需要认证。

## 支持的智能体

41 个智能体 —— 与 [vercel-labs/skills](https://github.com/vercel-labs/skills) 完整注册表保持同步。

<details>
<summary><strong>通用智能体</strong>（共享 <code>~/.agents/skills</code>）</summary>

| 智能体 | ID | 全局路径 |
|--------|----|---------:|
| Amp | `amp` | `$XDG_CONFIG_HOME/agents/skills` |
| Cline | `cline` | `~/.agents/skills` |
| Codex | `codex` | `$CODEX_HOME/skills` |
| Cursor | `cursor` | `~/.cursor/skills` |
| Gemini CLI | `gemini-cli` | `~/.gemini/skills` |
| GitHub Copilot | `github-copilot` | `~/.copilot/skills` |
| Kimi Code CLI | `kimi-cli` | `$XDG_CONFIG_HOME/agents/skills` |
| OpenCode | `opencode` | `$XDG_CONFIG_HOME/opencode/skills` |
| Replit | `replit` | `$XDG_CONFIG_HOME/agents/skills` |
| Universal | `universal` | `$XDG_CONFIG_HOME/agents/skills` |

</details>

<details>
<summary><strong>专属智能体</strong>（各自独立路径）</summary>

| 智能体 | ID | 全局路径 |
|--------|----|---------:|
| AdaL | `adal` | `~/.adal/skills` |
| Antigravity | `antigravity` | `~/.gemini/antigravity/skills` |
| Augment | `augment` | `~/.augment/skills` |
| Claude Code | `claude-code` | `$CLAUDE_CONFIG_DIR/skills` |
| CodeBuddy | `codebuddy` | `~/.codebuddy/skills` |
| Command Code | `command-code` | `~/.commandcode/skills` |
| Continue | `continue` | `~/.continue/skills` |
| Cortex Code | `cortex` | `~/.snowflake/cortex/skills` |
| Crush | `crush` | `$XDG_CONFIG_HOME/crush/skills` |
| Droid | `droid` | `~/.factory/skills` |
| Goose | `goose` | `$XDG_CONFIG_HOME/goose/skills` |
| iFlow CLI | `iflow-cli` | `~/.iflow/skills` |
| Junie | `junie` | `~/.junie/skills` |
| Kilo Code | `kilo` | `~/.kilocode/skills` |
| Kiro CLI | `kiro-cli` | `~/.kiro/skills` |
| Kode | `kode` | `~/.kode/skills` |
| MCPJam | `mcpjam` | `~/.mcpjam/skills` |
| Mistral Vibe | `mistral-vibe` | `~/.vibe/skills` |
| Mux | `mux` | `~/.mux/skills` |
| Neovate | `neovate` | `~/.neovate/skills` |
| OpenClaw | `openclaw` | `~/.openclaw/skills` |
| OpenHands | `openhands` | `~/.openhands/skills` |
| Pi | `pi` | `~/.pi/agent/skills` |
| Pochi | `pochi` | `~/.pochi/skills` |
| Qoder | `qoder` | `~/.qoder/skills` |
| Qwen Code | `qwen-code` | `~/.qwen/skills` |
| Roo Code | `roo` | `~/.roo/skills` |
| Trae | `trae` | `~/.trae/skills` |
| Trae CN | `trae-cn` | `~/.trae-cn/skills` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/skills` |
| Zencoder | `zencoder` | `~/.zencoder/skills` |

</details>

## 环境变量

| 变量 | 使用场景 | 默认值 |
|------|---------|--------|
| `GITHUB_TOKEN` | `push`、`pull` | — |
| `GH_TOKEN` | `push`、`pull` | — |
| `XDG_CONFIG_HOME` | `opencode`、`amp`、`kimi-cli`、`replit`、`universal`、`goose`、`crush` | `~/.config` |
| `CODEX_HOME` | `codex` | `~/.codex` |
| `CLAUDE_CONFIG_DIR` | `claude-code` | `~/.claude` |

## 工作原理

```
~/.agents/                  ← Git 仓库（push/pull 目标）
├── .skill-lock.json        ← 由 vercel-labs/skills 管理（只读）
└── skills/
    ├── my-skill/
    └── another-skill/

sm link 读取 .skill-lock.json → 创建相对路径符号链接：

~/.cursor/skills/my-skill          → ../../.agents/skills/my-skill
~/.claude/skills/my-skill          → ../../.agents/skills/my-skill
~/.config/opencode/skills/my-skill → ../../../.agents/skills/my-skill
```

```
sm link --project 读取 .skill-lock.json → 选择技能 → 选择复制/符号链接 → 选择智能体 → 复制/链接到 CWD：

./my-project/.agents/skills/my-skill    ← 从 ~/.agents/skills/ 复制
./my-project/.claude/skills/my-skill    ← 从 ~/.agents/skills/ 复制
```

## 技能

本项目在 `skills/skills-manager/` 提供了一个技能，教 AI 智能体如何操作 CLI —— push、pull 和 link 命令。

```bash
# 通过 vercel-labs/skills CLI 安装
npx skills add tc9011/skills-manager

# 将指定技能安装到指定智能体
npx skills add tc9011/skills-manager --skill skills-manager -a opencode -a claude-code

# 全局安装（跨项目可用）
npx skills add tc9011/skills-manager -g
```

## 贡献

### 初始化

```bash
git clone https://github.com/tc9011/skills-manager.git
cd skills-manager
npm install
```

### 开发

```bash
# 直接运行命令（无需构建）
npx tsx src/index.ts push
npx tsx src/index.ts link

# 或通过 npm script
npm run dev -- push
```

### 测试

```bash
npm test                  # 运行测试
npm run test:watch        # 监听模式
npm run test:coverage     # 生成覆盖率报告
```

### 构建

```bash
npm run build             # 编译 TypeScript → dist/
npm run lint              # 运行 ESLint
```

### 项目结构

```
src/
├── index.ts              # CLI 入口（Commander.js）
├── agents.ts             # 41 个智能体注册表 + 路径解析
├── auth.ts               # GitHub token 解析
├── config.ts             # XDG 规范的配置持久化
├── lockfile.ts           # 只读 .skill-lock.json 解析器
├── linker.ts             # 符号链接创建 + 项目级复制/链接
├── git-ops.ts            # 通过 simple-git 执行 Git push/pull
├── commands/
│   ├── push.ts           # Push 处理器
│   ├── pull.ts           # Pull 处理器（自动执行 link）
│   └── link.ts           # Link 处理器（交互式多选）
└── prompts/
    └── search-multiselect.ts  # 可搜索多选提示组件
```

### 发布

发布流程完全通过 [semantic-release](https://github.com/semantic-release/semantic-release) 自动化。只需使用 [Conventional Commits](https://www.conventionalcommits.org/) 并推送到 `main`：

| 提交前缀 | 版本升级 | 示例 |
|----------|---------|------|
| `fix:` | Patch（`0.1.0` → `0.1.1`） | `fix: handle missing config` |
| `feat:` | Minor（`0.1.0` → `0.2.0`） | `feat: add export command` |
| `feat!:` 或 `BREAKING CHANGE:` | Major（`0.1.0` → `1.0.0`） | `feat!: drop Node 18 support` |

CI 流水线会自动：
1. 分析上次发布以来的提交
2. 确定版本升级幅度
3. 更新 `package.json` + `CHANGELOG.md`
4. 发布到 npm
5. 创建 GitHub Release 并附带说明

## License

[MIT](./LICENSE)
