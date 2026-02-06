<div align="center">
  <h1>Skills Manager</h1>
  <p><strong>A desktop app to manage skills for AI coding agents</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#installation">Installation</a> •
    <a href="#usage">Usage</a> •
    <a href="#development">Development</a> •
    <a href="#contributing">Contributing</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/tauri-v2-blue?logo=tauri" alt="Tauri v2">
    <img src="https://img.shields.io/badge/react-19-61dafb?logo=react" alt="React 19">
    <img src="https://img.shields.io/badge/rust-stable-orange?logo=rust" alt="Rust">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
  </p>
</div>

---

**Skills Manager** is a cross-platform desktop application for managing "skills" — reusable instruction sets that enhance AI coding agents like [OpenCode](https://github.com/opencode-ai/opencode), Claude Code, and Cursor.

<p align="center">
  <img src="docs/screenshot.png" alt="Skills Manager Screenshot" width="600">
</p>

## Features

- 📦 **Global Skills** — View, add, and remove skills from `~/.agents/skills/`
- 📁 **Project Skills** — Open any folder to manage project-specific skills
- 🔄 **GitHub Sync** — Clone, pull, and push your skills to a Git repository
- 🔗 **Multi-Agent** — Automatically symlink skills to OpenCode, Claude Code, and Cursor
- ⚙️ **Settings** — Configure agent directories and preferences

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (recommended) or npm
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Platform-specific dependencies: [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### From Source

```bash
# Clone the repository
git clone https://github.com/your-username/skills-manager.git
cd skills-manager

# Install dependencies
pnpm install

# Run in development mode
pnpm dev:tauri
```

### Download

> Coming soon: Pre-built binaries for macOS, Windows, and Linux.

## Usage

### Managing Global Skills

1. Launch Skills Manager
2. The **Global** tab shows all skills in `~/.agents/skills/`
3. Click **Add Skill** to install a skill by name
4. Click any skill card to view details or delete

### Project Skills

1. Go to the **Project** tab
2. Click **Open Project Folder**
3. Skills in `.opencode/skill/`, `.claude/skills/`, or `.cursor/skills/` will be displayed

### GitHub Sync

1. Go to the **Sync** tab
2. Enter your repository URL and branch
3. Use **Pull** to fetch updates or **Commit & Push** to save changes

## Development

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:tauri` | Start development mode (frontend + Tauri) |
| `pnpm dev` | Start Vite frontend only |
| `pnpm build:tauri` | Build production app |
| `pnpm check:all` | Type check TypeScript and Rust |
| `pnpm clean` | Remove build artifacts |

### Project Structure

```
skills-manager/
├── src/                    # React frontend (TypeScript)
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   └── App.tsx             # Main app component
├── src-tauri/              # Rust backend
│   ├── src/commands/       # Tauri IPC commands
│   └── capabilities/       # Permission config
├── AGENTS.md               # AI agent context
└── README.md
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| UI | shadcn/ui, Radix UI, Lucide Icons |
| Backend | Rust, Tauri 2 |
| Plugins | tauri-plugin-fs, shell, dialog, opener |

### Debugging

- **DevTools**: `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux)
- **Rust logs**: `println!()` outputs to the terminal running `pnpm dev:tauri`
- **Type errors**: Run `pnpm check:all`

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Related

- [OpenCode](https://github.com/opencode-ai/opencode) — Terminal-based AI coding agent
- [skills CLI](https://github.com/opencode-ai/skills) — Command-line skill manager

## License

[MIT](LICENSE) © 2024
