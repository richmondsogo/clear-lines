# Clear Lines

Clear Lines is a focused, offline-first Tauri v2 desktop notes app. It keeps the
interface deliberately quiet so attention stays on the writing.

## Features

- Create, edit, pin, archive, trash, and permanently delete notes.
- Rich-text writing controls for bold, italics, and bulleted lists.
- Fast full-text note search (`Ctrl/Cmd + K`) and new-note shortcut
  (`Ctrl/Cmd + N`).
- Inbox, notes, archive, trash, and all-notes views with note counts.
- Persistent local data and preferences; notes are saved automatically in the
  browser webview storage on the device.
- Light, dark, or system theme, plus text-size and editor-width preferences.
- Responsive layout for narrow windows.

## Development

Prerequisites: Node.js 20+ and the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
for your platform (Rust stable, plus platform build tools).

```sh
npm install
npm run dev             # Run the web UI in a browser
npx tauri dev           # Run the desktop app
```

## Validation

```sh
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## Packaging

```sh
npx tauri build
```

The application only stores notes locally and makes no network requests.
