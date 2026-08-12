# Clear Lines QA audit

Date: 2026-08-12

This audit was completed against `docs/SPEC.md` before application code changes.
The production frontend build passed. Interactive desktop/browser checks are marked
**not exercised** because no controllable app browser is available in this session.

## Definition of done

| Requirement | Status | Evidence / issue |
| --- | --- | --- |
| `npm install && npm run tauri dev` launches | Partially working | `npm.cmd run build` passes; Tauri launch was not exercised. |
| Home, search, and New Note | Partially working | There is a list/editor layout, search and note creation; it is not the specified home screen or cover-first note flow. |
| Persistent covers, icon, title, subtitle, metadata | Missing | Note model has no cover, icon, subtitle, tags, or cover UI. |
| Full rich-text editor, floating toolbar, slash menu | Partially working | Bold, italic, underline, strike, bullet and task lists, link extension, undo/redo exist; headings are extension-only, and code, numbered lists, quote, colour, image, floating toolbar and slash menu are absent. |
| Folders, tags, pinning, trash persist | Partially working | Fixed Inbox/Notes/Archive/Trash, pinning and permanent deletion exist. User folders, tags, restore, ordering and auto-purge are absent. |
| Autosave, save indicator, restart safety | Partially working | React changes are synchronously copied to `localStorage`; there is no debounce, indicator, app-data JSON/index, atomic write, or index recovery. |
| Theme and accent persistence | Partially working | System/light/dark themes persist; accent picker is absent. |
| All listed keyboard shortcuts | Broken | Only New Note and Search are registered at app level. Editor-native bold/italic may work, but the listed complete shortcut set is not implemented or documented. |
| Frameless custom titlebar controls | Missing | The Tauri window is frameless, but the app supplies no draggable titlebar or minimize/maximize/close controls. |
| README run/build instructions | Working | README documents install, Vite/Tauri launch, build and package commands. |

## Core features and visual system

| Area | Status | Evidence / issue |
| --- | --- | --- |
| Glass shell and animated mesh background | Missing | Existing UI uses opaque paper/panel/sidebar CSS without blur, elevation tokens, mesh blobs, or motion. |
| Collapsible, resizable sidebar | Partially working | It can collapse, but width is fixed, not draggable or persisted, and folders are fixed. |
| Cover banner picker and asset import | Missing | No cover model, picker, dialog usage, or appData asset handling. |
| Emoji picker, subtitle, tags and metadata | Missing | Not represented in the type or UI. |
| Search across title/subtitle/tags/body, highlights | Partially working | Case-insensitive title/body substring matching only; no tags/subtitle/grouping/highlights. |
| Trash restore and 30-day purge | Missing | Only move to trash/delete forever exists. |
| File-backed lazy persistence and corrupt-index rebuild | Missing | Storage is one localStorage key. |
| Accessibility and responsive states | Partially working | Focus outlines and narrow layout exist; cover contrast, keyboard navigation and all required empty/edge states cannot be met without the missing cover and organization features. |

## Manual exercise coverage

The following must be repeated in a running Tauri window after fixes: all cover
variants, image paste/drop, selection toolbar, slash menu, force-quit/restart,
index rebuild, titlebar controls, resize persistence and every keyboard shortcut.
They could not be honestly exercised in this environment because the requested
in-app browser is unavailable.

## Priority list

1. Replace the under-specified note data model/persistence behavior with durable
   metadata that supports covers, tags, folder assignment and recovery.
2. Add cover-page and organization interactions so a newly created note matches
   the specified flow.
3. Add missing editor controls and shortcut handling without disrupting Tiptap's
   native history.
4. Add the custom desktop chrome, persisted layout/theme/accent settings, then
   apply the glass visual tokens consistently.
