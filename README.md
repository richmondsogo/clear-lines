# Clear Lines

A focused, offline-first notes app for the desktop.

Clear Lines gives you a quiet writing surface with local storage and fast search. No account, no cloud, no sync service watching over your notes — just a fast native window that opens when you need it and gets out of the way otherwise. Built with Tauri v2, React, and TypeScript.

## Features

- Distraction-free writing surface
- Local-only storage — your notes never leave your machine
- Fast search across your notes
- Custom frameless window with its own titlebar (minimize, maximize/restore, close, drag-to-move), built directly on Tauri's window APIs

## Built with AI agents

Clear Lines was built using AI coding agents — Codex and Antigravity — as the primary development workflow, submitted for The Orchestra: AO Hackathon. Most iteration happened directly in VS Code's agent panel and terminal sessions, with [Agent Orchestrator](https://aoagents.dev) tracking a build task on its Kanban board (shown in the demo video below).

**Demo video:** https://www.youtube.com/watch?v=9BD88ib1vLY

## Quick start

### Prerequisites

- Node.js 20+ and npm
- Rust (stable), plus Tauri's platform tooling — only required to build the desktop app, not for web-only dev
  - On Windows: install **Visual Studio Build Tools** with the **"Desktop development with C++"** (MSVC) workload

### Fast local test (web only, no Rust needed)

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173` or `1420`).

### Run the native desktop app (dev)

```bash
npm install
npx tauri dev
```

Use `npm run dev` for fast UI iteration with hot module reloading. Use `npx tauri dev` when you need to test native APIs — it compiles the Rust backend too, so it's slower to start.

## Build & package

```bash
npm install
npm run build      # builds web assets (tsc + vite)
npx tauri build     # builds native installer/executable
```

To target a specific platform, e.g. Windows x64:

```bash
npx tauri build --target x86_64-pc-windows-msvc
```

Build artifacts land in `src-tauri/target/release/bundle/`, under a platform-specific subfolder.

## Project layout

```
src/          — frontend (React + TypeScript)
src-tauri/    — Rust backend for Tauri
package.json  — npm scripts
spec.md       — original product spec
```

## How the custom window works

A couple of implementation details worth knowing if you're touching the titlebar or window controls:

**`WindowControls` (in `src/App.tsx`)** — handles minimize, maximize, and close. It calls the Rust commands first via `@tauri-apps/api/core`'s `invoke`, and falls back to the JS `@tauri-apps/api/window` API if that fails. The buttons are explicitly excluded from the drag region so clicks register correctly on Windows.

**Titlebar dragging** — implemented with explicit JS dragging rather than a CSS drag region: on `mousedown`, the frontend calls `getCurrentWindow().startDragging()`. This sidesteps nested drag-region issues on Windows while keeping the window control buttons clickable.

**Rust command handlers (`src-tauri/src/lib.rs`)** — `minimize_window`, `toggle_maximize` (returns the new state), `close_window`, `is_maximized`.

## Troubleshooting

**Vite port already in use**
```bash
npx kill-port 1420
```
or find and stop the process manually:
```bash
netstat -ano | findstr :1420
Stop-Process -Id <PID> -Force
```

**Native build errors on Windows**
- Confirm Visual Studio Build Tools has the "Desktop development with C++" workload installed
- Update Rust: `rustup update`
- Check native errors directly: `cargo check --manifest-path src-tauri/Cargo.toml`

**Runtime errors calling window APIs**
The frontend tries the Rust `invoke` path first and falls back to `getCurrentWindow()`. Check both the DevTools console and the terminal running `npx tauri dev` for the actual error.

## Contributing

```bash
git checkout -b feat/short-description
npm run test
npm run build
```
Then open a PR against `main`.

## Privacy

All data is stored locally. Clear Lines does not send notes or preferences to any external service.

## License

Apache-2.0
