

ROLE
You are a senior desktop application engineer. Build the complete application described below — every file, fully working, no placeholders, no "TODO: implement this later." Do not ask clarifying questions; where a decision isn't specified, make the most sensible choice, apply it consistently, and leave a one-line comment explaining the assumption. Optimize for something that runs correctly on npm run tauri dev the first time.

TECH STACK (locked — do not substitute)
Shell: Tauri v2 (Rust backend, webview frontend)
Frontend: React 18 + TypeScript, Vite as the bundler
Rich text editor: Tiptap (ProseMirror-based) with StarterKit + extensions listed below
State management: Zustand
Styling: plain CSS with CSS variables (no Tailwind) — glassmorphism depends on precise, hand-tuned backdrop-filter/box-shadow values, which is easier to control and reason about in raw CSS
Animation: Framer Motion for transitions/micro-interactions
Persistence: no external database. Each note is a JSON file on disk inside Tauri's appDataDir (via @tauri-apps/plugin-fs), plus a single index.json manifest file (id, title, folder, tags, pinned, createdAt, updatedAt, coverSummary) that the app reads on launch so it never has to parse every note file just to render the sidebar/home screen.
Search: in-memory full-text search over the manifest + lazily-loaded note bodies (Fuse.js is fine) — no need for a search index database at this scale.
Package manager: npm

PRODUCT CONCEPT
Clear Lines is a local-first, offline notes app with a frosted-glass visual language (blurred translucent panels floating over a soft animated gradient background — think macOS Big Sur meets Notion). There are two distinct "title" surfaces in this app — build both:

App Home Screen — the first thing you see on launch. A glass hero view: app name, a search bar, a grid of note cards (each card previews that note's own cover), and a prominent "New Note" action. This is navigation/overview, not part of any single note.
Per-Note Cover Page — every individual note has its own title page, Notion-style: a full-bleed banner (color, gradient, or image) at the top of the note, an icon/emoji overlapping the banner, a large editable title beneath it, an optional subtitle/description line, and metadata (created/updated date, tags, word count). Scrolling past the cover reveals the note's rich-text body. The cover is part of the note's data — it's saved with the note, editable at any time, and shown again every time that note is opened.

CORE FEATURES

1. App shell & navigation
Frameless custom window (decorations: false in tauri.conf.json) with a custom draggable titlebar that has its own glass styling and macOS-style traffic-light-style buttons (close/minimize/maximize) implemented with Tauri's window API.
Collapsible left sidebar: Home, folders (user-creatable, nestable one level deep), tags, Pinned, Trash.
Sidebar and content area are both glass panels floating over an animated gradient/mesh background (subtle, slow-moving, low-opacity blobs — CSS only, no video/canvas needed).
Resizable sidebar width (drag handle), persisted in local settings.
2. Home screen (app-level title page)
Large app title/logo, greeting text (e.g. "Good afternoon"), and a search bar with Cmd/Ctrl+K shortcut to focus it.
Grid of note cards. Each card shows: the note's cover thumbnail (mini version of its banner + icon), title, subtitle/first line of body, updated-at, and tag chips.
"New Note" button opens a brand-new note straight into its cover page in edit mode (cursor in the title field).
Empty state (no notes yet) with a friendly illustration-free glass card and a call to action.
3. Per-note cover page
Banner: user picks a solid color, a preset gradient (ship ~8 curated gradients), or an uploaded image (via Tauri file dialog, copied into appDataDir/covers/). Clicking the banner opens a small glass popover to change it.
Icon: an emoji picker (small built-in set, no external API) shown overlapping the bottom-left of the banner.
Title: large (40px+), editable inline, auto-grows.
Subtitle: optional smaller line under the title ("add a subtitle…" placeholder).
Metadata row: created date, last-edited date, live word count, tag chips (add/remove inline).
Smooth scroll transition from cover into the editable body (framer-motion, not jarring).
4. Rich text editor (note body)
Using Tiptap StarterKit plus:

* Bold, italic, underline, strikethrough
* Headings H1–H3
* Bullet list, numbered list, task list (checkboxes)
* Blockquote
* Code block with syntax highlighting (lowlight)
* Inline code
* Links (with hover preview + edit popover)
* Text color and highlight color (small curated palette, matching the app's glass theme)
* Horizontal rule
* Inline images (drag-drop or paste, copied into appDataDir/attachments/)
* Floating selection toolbar (glass pill) on text select, plus a /-slash command menu for block types
* Full undo/redo, standard OS text shortcuts

5. Note organization
Folders: create/rename/delete/reorder, drag notes between folders
Tags: freeform, multiple per note, clickable to filter
Pin notes to the top of Home
Trash: soft-delete with "restore" and "delete forever," auto-purge after 30 days
Sort options: last edited, created, title A–Z, manual
Full-text search across titles, subtitles, tags, and body content, with results grouped and highlighted
6. Theming
Light and dark glass themes, toggle in settings, respects OS preference by default
One accent color picker that tints the glass highlights, selection color, and active states app-wide
7. Keyboard shortcuts (implement all of these)
Cmd/Ctrl+N new note · Cmd/Ctrl+K search · Cmd/Ctrl+B/I/U formatting · Cmd/Ctrl+Shift+X strikethrough · Cmd/Ctrl+Alt+1/2/3 headings · Cmd/Ctrl+Shift+7/8 numbered/bullet list · Cmd/Ctrl+Shift+9 task list · Cmd/Ctrl+E inline code · Esc back to Home from a note
8. Persistence behavior
Debounced autosave (600ms after last keystroke) to the note's JSON file and to index.json
Never block the UI thread on writes; show a subtle "saved" indicator (glass toast, fades after 1.5s) after a successful write
On launch, read index.json only (fast cold start); load a note's full body lazily when opened
Graceful handling of a missing/corrupt index.json (rebuild it by scanning the notes directory)

DATA MODEL

```typescript
interface Note {
  id: string;              // uuid
  title: string;
  subtitle?: string;
  icon?: string;            // emoji
  cover: {
    type: "color" | "gradient" | "image";
    value: string;          // hex, gradient CSS string, or relative file path
  } | null;
  folderId: string | null;
  tags: string[];
  pinned: boolean;
  content: JSONContent;      // Tiptap/ProseMirror JSON document
  createdAt: string;         // ISO
  updatedAt: string;         // ISO
  deletedAt: string | null;  // soft delete
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

interface AppSettings {
  theme: "light" | "dark" | "system";
  accentColor: string;
  sidebarWidth: number;
}

```

VISUAL DESIGN SYSTEM — GLASSMORPHISM SPEC
Be precise here; this is the whole aesthetic of the app.

Background: full-window fixed gradient mesh, 3–4 large soft-edged blurred color blobs (CSS radial-gradients), very slow ambient drift animation (60–90s loop), low saturation so glass panels stay readable on top.
Glass panel base: background: rgba(255,255,255,0.12) (dark theme) / rgba(255,255,255,0.55) (light theme)
backdrop-filter: blur(24px) saturate(150%)
border: 1px solid rgba(255,255,255,0.18)
border-radius: 16px (20px for large cards, 10px for chips/buttons)
box-shadow: 0 8px 32px rgba(0,0,0,0.15) plus a faint inset top highlight (inset 0 1px 0 rgba(255,255,255,0.25)) to sell the "edge catching light" look
Elevation tiers: define 3 levels (base panel, raised card/popover, modal) each with slightly stronger blur + shadow, expose as CSS variables so components compose cleanly
Typography: system font stack for UI chrome (-apple-system, "Segoe UI", sans-serif) — use a distinct serif or rounded display font for note titles/cover text to make covers feel intentional (e.g. a warm serif for editorial feel — pick one, but don't just default to Inter for everything)
Motion: panel entrances fade+scale (200ms, ease-out), sidebar collapse slides, cover-to-body scroll transition is spring-based, hover states are 120ms
Color palette: keep it restrained — glass surfaces are neutral (white/black at varying opacity), the accent color is the only saturated hue in the whole UI besides user-chosen note covers

FILE STRUCTURE (produce this exact layout)

```text
clear-lines/
├── src-tauri/
│   ├── src/main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/default.json      (fs, dialog, window permissions scoped to appDataDir)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── titlebar/
│   │   ├── sidebar/
│   │   ├── home/
│   │   ├── note/
│   │   │   ├── NoteCover.tsx
│   │   │   ├── NoteEditor.tsx
│   │   │   └── EditorToolbar.tsx
│   │   └── shared/           (GlassPanel, Button, EmojiPicker, ColorPicker, Toast, etc.)
│   ├── store/                (zustand stores: notes, folders, settings, ui)
│   ├── lib/
│   │   ├── fs.ts             (all Tauri fs read/write/index logic)
│   │   ├── search.ts
│   │   └── types.ts
│   ├── styles/
│   │   ├── globals.css       (CSS variables, glass tokens, theme classes)
│   │   └── ...component css files, co-located or in styles/
│   └── hooks/
├── package.json
└── README.md                 (setup + run instructions)

```

NON-FUNCTIONAL REQUIREMENTS
Cross-platform: must work on macOS, Windows, and Linux (avoid macOS-only vibrancy APIs; achieve the glass look with CSS backdrop-filter so it's consistent everywhere)
No data loss: writes are atomic (write to temp file, then rename) so a crash mid-save can't corrupt a note
Cold start under ~300ms perceived (index.json only, no eager body loads)
Fully typed, no any in application code
Accessible: focus states visible against glass, sufficient contrast on text over covers/gradients, all interactive elements reachable by keyboard

DEFINITION OF DONE
[ ] npm install && npm run tauri dev launches the app with no errors
[ ] Home screen renders, search works, "New Note" creates a note and opens straight to its cover in edit mode
[ ] Every note has a working cover (color/gradient/image + icon + title + subtitle + metadata) that persists
[ ] Rich text editor supports every formatting option listed above, with a working floating toolbar and slash menu
[ ] Folders, tags, pinning, and trash all work end-to-end and persist across restarts
[ ] Autosave works, with a visible save indicator, and surviving an app restart with no data loss
[ ] Light/dark theme toggle and accent color both work and persist
[ ] All listed keyboard shortcuts work
[ ] Window is frameless with a functioning custom titlebar (drag, minimize, maximize, close)
[ ] README explains how to run and build the app

Build it now — produce every file in full.
