import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import {
  Archive, Check, ChevronRight, Code, Copy, FileText, FolderOpen, Inbox,
  List, ListTodo, Maximize2, Menu, Minimize2, Minus, Moon, MoreHorizontal,
  Palette, PanelLeft, PanelLeftClose, Pin, Plus, Quote, Redo, RotateCcw,
  Search, Settings, Sparkles, Square, Sun, Tag, Trash2, Undo, X
} from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { cleanText, loadData, noteTitle, saveData } from "./storage";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import type { Folder, Note, NoteCover, Preferences } from "./types";

type View = Folder | "all" | "settings";

const folderMeta: Record<Folder, { label: string; icon: typeof Inbox }> = {
  inbox: { label: "Inbox", icon: Inbox },
  notes: { label: "Notes", icon: FileText },
  archive: { label: "Archive", icon: Archive },
  trash: { label: "Trash", icon: Trash2 }
};

const makeNote = (): Note => ({
  id: crypto.randomUUID(),
  title: "",
  subtitle: "",
  icon: "✦",
  body: "",
  folder: "inbox",
  tags: [],
  cover: { type: "gradient", value: "linear-gradient(135deg, #4b6b55, #9bbd96)" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  deletedAt: null
});

const coverPresets: NoteCover[] = [
  { type: "gradient", value: "linear-gradient(135deg, #4b6b55, #9bbd96)" },
  { type: "gradient", value: "linear-gradient(135deg, #4a6fa5, #88b04b)" },
  { type: "gradient", value: "linear-gradient(135deg, #6c5b7b, #c06c84)" },
  { type: "gradient", value: "linear-gradient(135deg, #2b580c, #639a67)" },
  { type: "gradient", value: "linear-gradient(135deg, #d4a373, #fefae0)" },
  { type: "gradient", value: "linear-gradient(135deg, #1f2041, #4b3f72)" },
  { type: "color", value: "#3a4a3e" },
  { type: "color", value: "#2c3e50" }
];

const emojis = ["✦", "✎", "☼", "☕", "⌁", "❋", "☁", "♡", "◆", "✿", "💡", "⚡", "🎯", "📚"];

function formatDate(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(date));
}

function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  useEffect(() => {
    if (!isTauri) return;
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setIsMaximized).catch(() => {});
  }, [isTauri]);

  const handleMinimize = async () => {
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('minimize_window');
        return;
      }
    } catch (e: any) {
      console.error('invoke minimize error', e);
      // fallback to window API
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().minimize();
        return;
      } catch (e2: any) {
        console.error('fallback minimize error', e2);
      }
    }
  };

  const handleMaximize = async () => {
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const maxed = await invoke('toggle_maximize');
        setIsMaximized(Boolean(maxed));
        return;
      }
    } catch (e: any) {
      console.error('invoke maximize error', e);
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
        const maxed = await getCurrentWindow().isMaximized();
        setIsMaximized(Boolean(maxed));
        return;
      } catch (e2: any) {
        console.error('fallback maximize error', e2);
      }
    }
  };

  const handleClose = async () => {
    try {
      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('close_window');
        showDebug('close ok');
        return;
      }
    } catch (e: any) {
      console.error('invoke close error', e);
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
          return;
        } catch (e2: any) {
          console.error('fallback close error', e2);
        }
    }
  };

  return (
    <div className="window-controls" data-tauri-drag-region="false">
      <button className="win-btn minimize" data-tauri-drag-region="false" onClick={handleMinimize} title="Minimize">
        <Minus size={12} />
      </button>
      <button className="win-btn maximize" data-tauri-drag-region="false" onClick={handleMaximize} title="Maximize">
        {isMaximized ? <Copy size={11} /> : <Square size={11} />}
      </button>
      <button className="win-btn close" data-tauri-drag-region="false" onClick={handleClose} title="Close">
        <X size={12} />
      </button>
    </div>
  );
}

export default function App() {
  const initial = useMemo(loadData, []);
  const [notes, setNotes] = useState(initial.notes);
  const [preferences, setPreferences] = useState<Preferences>(initial.preferences);
  const [view, setView] = useState<View>("inbox");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initial.notes[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saved");
  const editorRef = useRef<HTMLDivElement>(null);

  // Use explicit JS dragging so clickable elements in the titlebar are not
  // blocked by CSS/data-attribute-based drag regions on Windows.
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  const handleTitlebarMouseDown = async (e: MouseEvent) => {
    // If the click originated from a control button or other interactive
    // element, don't start dragging so clicks still register.
    const el = e.target as HTMLElement | null;
    if (!el) return;
    if (el.closest('.win-btn') || el.closest('.titlebar-actions') || el.closest('button') || el.getAttribute('role') === 'button') return;
    if (!isTauri) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      // ignore drag errors in non-tauri or unsupported environments
    }
  };

  const selected = notes.find((note) => note.id === selectedId) ?? null;

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach(note => note.tags?.forEach(tag => tagsSet.add(tag)));
    return Array.from(tagsSet).sort();
  }, [notes]);

  const visible = notes.filter(note => {
    const matchesView = view === "all" || note.folder === view;
    const matchesTag = !selectedTag || (note.tags || []).includes(selectedTag);
    const haystack = `${noteTitle(note)} ${note.subtitle || ""} ${(note.tags || []).join(" ")} ${cleanText(note.body)}`.toLowerCase();
    return matchesView && matchesTag && haystack.includes(query.toLowerCase());
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || +new Date(b.updatedAt) - +new Date(a.updatedAt));

  useEffect(() => {
    setSaveStatus("saving");
    const snapshot = { notes, preferences };
    const timeout = window.setTimeout(() => setSaveStatus(saveData(snapshot) ? "saved" : "error"), 500);
    return () => window.clearTimeout(timeout);
  }, [notes, preferences]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.font = preferences.fontSize;
    document.documentElement.dataset.width = preferences.lineWidth;
    document.documentElement.style.setProperty("--accent", preferences.accentColor);
  }, [preferences]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        createNote();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function createNote() {
    const note = makeNote();
    setNotes(current => [note, ...current]);
    setSelectedId(note.id);
    setView("inbox");
    setSelectedTag(null);
    setQuery("");
    setTimeout(() => document.getElementById("note-title")?.focus(), 50);
  }

  function updateNote(patch: Partial<Note>) {
    if (!selected) return;
    setNotes(current => current.map(note => note.id === selected.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note));
  }

  function moveNote(folder: Folder) {
    updateNote({ folder, deletedAt: folder === "trash" ? new Date().toISOString() : null });
    if (folder === "trash") setView("trash");
  }

  function deleteForever() {
    if (!selected) return;
    const remaining = notes.filter(note => note.id !== selected.id);
    setNotes(remaining);
    setSelectedId(remaining[0]?.id ?? null);
  }

  function chooseView(next: View) {
    setView(next);
    setSelectedTag(null);
    setQuery("");
    if (next !== "settings" && visible.length > 0) {
      setSelectedId(visible[0].id);
    }
  }

  const counts = (folder: Folder) => notes.filter(note => note.folder === folder).length;

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      {/* Top Titlebar (use JS dragging so buttons remain clickable) */}
      <header className="app-titlebar" onMouseDown={handleTitlebarMouseDown}>
        <div className="titlebar-brand">
          <div className="brand-logo">
            <Sparkles size={14} />
          </div>
          <span className="brand-title">Clear Lines</span>
        </div>

        <div className="titlebar-drag-spacer" />

        <div className="titlebar-actions">
          <button className="titlebar-btn" onClick={() => setShowSearch(true)} title="Search (Ctrl+K)">
            <Search size={14} />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
          <WindowControls />
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="primary-action-btn" onClick={createNote}>
              <Plus size={16} />
              <span>New Note</span>
              <kbd>⌘N</kbd>
            </button>
            <button
              className="icon-btn collapse-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <PanelLeftClose size={16} />
            </button>
          </div>

          <nav className="nav-group">
            <div className="nav-section-label">Library</div>
            <Nav
              icon={FolderOpen}
              label="All Notes"
              active={view === "all" && !selectedTag}
              count={notes.filter(n => n.folder !== "trash").length}
              onClick={() => chooseView("all")}
            />
            {(Object.keys(folderMeta) as Folder[]).map(folder => (
              <Nav
                key={folder}
                icon={folderMeta[folder].icon}
                label={folderMeta[folder].label}
                active={view === folder && !selectedTag}
                count={counts(folder)}
                onClick={() => chooseView(folder)}
              />
            ))}

            {allTags.length > 0 && (
              <>
                <div className="nav-section-label margin-top">Tags</div>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`nav-item tag-nav-item ${selectedTag === tag ? "active" : ""}`}
                    onClick={() => {
                      setSelectedTag(tag === selectedTag ? null : tag);
                    }}
                  >
                    <Tag size={15} />
                    <span>#{tag}</span>
                  </button>
                ))}
              </>
            )}
          </nav>

          <div className="sidebar-footer">
            <button
              className={`nav-item ${view === "settings" ? "active" : ""}`}
              onClick={() => chooseView("settings")}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <div className="sidebar-footnote">Clear Lines v0.1.0</div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="main-content">
          {view === "settings" ? (
            <SettingsPanel preferences={preferences} setPreferences={setPreferences} />
          ) : (
            <div className="workspace">
              {/* Note List Column */}
              <section className="note-list-panel">
                <div className="list-header">
                  {!sidebarOpen && (
                    <button
                      className="icon-btn expand-btn"
                      onClick={() => setSidebarOpen(true)}
                      title="Expand sidebar"
                    >
                      <PanelLeft size={16} />
                    </button>
                  )}
                  <h2 className="list-title">
                    {selectedTag
                      ? `#${selectedTag}`
                      : view === "all"
                      ? "All Notes"
                      : folderMeta[view].label}
                  </h2>
                  <span className="count-badge">{visible.length}</span>
                  <button className="icon-btn add-btn" onClick={createNote} title="New note">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="note-cards-scroll">
                  {visible.length > 0 ? (
                    visible.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        selected={note.id === selectedId}
                        onClick={() => setSelectedId(note.id)}
                      />
                    ))
                  ) : (
                    <div className="empty-list-state">
                      <FileText size={32} />
                      <p>No notes found</p>
                      <button className="secondary-btn" onClick={createNote}>
                        Create a note
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Editor Workspace */}
              <Editor
                note={selected}
                editorRef={editorRef}
                onUpdate={updateNote}
                onMove={moveNote}
                onDelete={deleteForever}
              />
            </div>
          )}
        </main>
      </div>

      {/* Footer Status Bar */}
      <div className={`status-indicator ${saveStatus}`}>
        {saveStatus === "saving" ? "Saving changes..." : saveStatus === "error" ? "Storage error" : "Saved"}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchDialog
          query={query}
          setQuery={setQuery}
          notes={notes}
          onClose={() => setShowSearch(false)}
          onSelect={note => {
            setSelectedId(note.id);
            setView(note.folder);
            setShowSearch(false);
          }}
        />
      )}
    </div>
  );
}

function Nav({ icon: Icon, label, active, count, onClick }: { icon: typeof Inbox; label: string; active: boolean; count?: number; onClick(): void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={16} />
      <span>{label}</span>
      {count !== undefined && <span className="nav-count">{count}</span>}
    </button>
  );
}

function NoteCard({ note, selected, onClick }: { note: Note; selected: boolean; onClick(): void }) {
  const title = noteTitle(note);
  const snippet = note.subtitle || cleanText(note.body) || "No content yet";

  return (
    <div className={`note-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <div className="card-top-row">
        <span className="card-icon">{note.icon || "✦"}</span>
        <h3 className="card-title">{title}</h3>
        {note.pinned && <Pin size={12} className="card-pin" />}
      </div>
      <p className="card-snippet">{snippet}</p>
      <div className="card-meta">
        <time>{formatDate(note.updatedAt)}</time>
        {note.tags && note.tags.length > 0 && (
          <div className="card-tags">
            {note.tags.slice(0, 2).map(tag => (
              <span key={tag} className="card-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ note, editorRef, onUpdate, onMove, onDelete }: { note: Note | null; editorRef: RefObject<HTMLDivElement>; onUpdate(patch: Partial<Note>): void; onMove(folder: Folder): void; onDelete(): void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (!note) {
    return (
      <div className="editor-empty-container">
        <div className="empty-content">
          <div className="empty-icon-circle">
            <Sparkles size={28} />
          </div>
          <h2>Select a Note</h2>
          <p>Choose a note from the left sidebar list or create a new note to start writing.</p>
          <button className="primary-action-btn" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true }))}>
            <Plus size={16} />
            <span>Create New Note</span>
          </button>
        </div>
      </div>
    );
  }

  const wordCount = cleanText(note.body).split(/\s+/).filter(Boolean).length;

  return (
    <article className="editor-workspace">
      {/* Editor Sub-Header Toolbar */}
      <div className="editor-toolbar-header">
        <div className="meta-info">
          <span className="meta-date">Updated {formatDate(note.updatedAt)}</span>
          <span className="meta-divider">•</span>
          <span className="meta-words">{wordCount} words</span>
        </div>

        <div className="editor-top-actions">
          <button
            className={`icon-btn ${note.pinned ? "active-pin" : ""}`}
            onClick={() => onUpdate({ pinned: !note.pinned })}
            title={note.pinned ? "Unpin note" : "Pin note"}
          >
            <Pin size={16} />
          </button>

          <div className="menu-container">
            <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)} title="Note options">
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="dropdown-menu">
                <button onClick={() => { onUpdate({ pinned: !note.pinned }); setMenuOpen(false); }}>
                  <Pin size={14} />
                  <span>{note.pinned ? "Unpin Note" : "Pin Note"}</span>
                </button>
                {note.folder !== "archive" && note.folder !== "trash" && (
                  <button onClick={() => { onMove("archive"); setMenuOpen(false); }}>
                    <Archive size={14} />
                    <span>Archive Note</span>
                  </button>
                )}
                {note.folder === "trash" ? (
                  <>
                    <button onClick={() => { onMove("inbox"); setMenuOpen(false); }}>
                      <RotateCcw size={14} />
                      <span>Restore Note</span>
                    </button>
                    <button className="danger" onClick={onDelete}>
                      <Trash2 size={14} />
                      <span>Delete Permanently</span>
                    </button>
                  </>
                ) : (
                  <button className="danger" onClick={() => { onMove("trash"); setMenuOpen(false); }}>
                    <Trash2 size={14} />
                    <span>Move to Trash</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="editor-scroll-body">
        {/* Cover Image Banner Component */}
        <NoteCoverBanner note={note} onUpdate={onUpdate} />

        <div className="editor-fields-container">
          <input
            id="note-title"
            className="title-input"
            value={note.title}
            placeholder="Untitled Note"
            onChange={e => onUpdate({ title: e.target.value })}
          />

          <input
            className="subtitle-input"
            value={note.subtitle || ""}
            placeholder="Add a subtitle or summary..."
            onChange={e => onUpdate({ subtitle: e.target.value })}
          />

          <TiptapEditor key={note.id} content={note.body} onUpdate={body => onUpdate({ body })} />
        </div>
      </div>
    </article>
  );
}

function NoteCoverBanner({ note, onUpdate }: { note: Note; onUpdate(patch: Partial<Note>): void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#/, "");
    if (tag && !(note.tags || []).some(t => t.toLowerCase() === tag.toLowerCase())) {
      onUpdate({ tags: [...(note.tags || []), tag] });
    }
    setTagDraft("");
  };

  return (
    <div className="note-cover-banner" style={note.cover ? { background: note.cover.value } : undefined}>
      <div className="cover-controls">
        <button className="cover-picker-btn" onClick={() => setPickerOpen(!pickerOpen)}>
          <Palette size={14} />
          <span>Change Cover</span>
        </button>

        {pickerOpen && (
          <div className="cover-popover">
            <span className="popover-title">Preset Styles</span>
            <div className="swatch-grid">
              {coverPresets.map((cover, i) => (
                <button
                  key={i}
                  className="swatch-item"
                  style={{ background: cover.value }}
                  onClick={() => {
                    onUpdate({ cover });
                    setPickerOpen(false);
                  }}
                />
              ))}
            </div>
            <button className="clear-cover-btn" onClick={() => { onUpdate({ cover: null }); setPickerOpen(false); }}>
              Remove Cover
            </button>
          </div>
        )}
      </div>

      <div className="emoji-picker-row">
        {emojis.slice(0, 8).map(emoji => (
          <button
            key={emoji}
            className={`emoji-btn ${note.icon === emoji ? "active" : ""}`}
            onClick={() => onUpdate({ icon: emoji })}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="note-avatar-badge">{note.icon || "✦"}</div>

      <div className="tag-bar">
        <Tag size={13} className="tag-icon" />
        {(note.tags || []).map(tag => (
          <span className="tag-pill" key={tag}>
            #{tag}
            <button onClick={() => onUpdate({ tags: (note.tags || []).filter(t => t !== tag) })}>×</button>
          </span>
        ))}
        <input
          className="tag-input"
          value={tagDraft}
          onChange={e => setTagDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="+ Tag"
        />
      </div>
    </div>
  );
}

function TiptapEditor({ content, onUpdate }: { content: string; onUpdate(value: string): void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false })
    ],
    content,
    editorProps: {
      attributes: {
        class: "tiptap-editable-content",
        "data-placeholder": "Start writing your note..."
      }
    },
    onUpdate: ({ editor: instance }) => onUpdate(instance.getHTML())
  });

  if (!editor) return null;

  const action = (cb: () => void) => (e: MouseEvent) => {
    e.preventDefault();
    cb();
  };

  return (
    <div className="rich-editor-container">
      <div className="format-toolbar">
        <button
          className={editor.isActive("bold") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleBold().run())}
          title="Bold (Ctrl+B)"
        >
          <b>B</b>
        </button>
        <button
          className={editor.isActive("italic") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleItalic().run())}
          title="Italic (Ctrl+I)"
        >
          <i>I</i>
        </button>
        <button
          className={editor.isActive("underline") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleUnderline().run())}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          className={editor.isActive("strike") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleStrike().run())}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
        <div className="toolbar-divider" />
        <button
          className={editor.isActive("bulletList") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleBulletList().run())}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          className={editor.isActive("taskList") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleTaskList().run())}
          title="Task List"
        >
          <ListTodo size={14} />
        </button>
        <button
          className={editor.isActive("codeBlock") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleCodeBlock().run())}
          title="Code Block"
        >
          <Code size={14} />
        </button>
        <button
          className={editor.isActive("blockquote") ? "active" : ""}
          onMouseDown={action(() => editor.chain().focus().toggleBlockquote().run())}
          title="Quote"
        >
          <Quote size={14} />
        </button>
        <div className="toolbar-divider" />
        <button onMouseDown={action(() => editor.chain().focus().undo().run())} title="Undo">
          <Undo size={14} />
        </button>
        <button onMouseDown={action(() => editor.chain().focus().redo().run())} title="Redo">
          <Redo size={14} />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

function SettingsPanel({ preferences, setPreferences }: { preferences: Preferences; setPreferences: Dispatch<SetStateAction<Preferences>> }) {
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPreferences(p => ({ ...p, [key]: value }));

  const accentPresets = ["#54755e", "#4a6fa5", "#9b59b6", "#e67e22", "#e74c3c", "#34495e"];

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2>Preferences</h2>
        <p>Customize your Clear Lines writing environment.</p>
      </div>

      <div className="settings-sections">
        <section className="setting-card">
          <h3>Theme</h3>
          <p className="setting-desc">Choose between Light, Dark, or System mode.</p>
          <div className="segment-control">
            <button className={preferences.theme === "system" ? "chosen" : ""} onClick={() => set("theme", "system")}>
              <Settings size={14} />
              <span>System</span>
            </button>
            <button className={preferences.theme === "light" ? "chosen" : ""} onClick={() => set("theme", "light")}>
              <Sun size={14} />
              <span>Light</span>
            </button>
            <button className={preferences.theme === "dark" ? "chosen" : ""} onClick={() => set("theme", "dark")}>
              <Moon size={14} />
              <span>Dark</span>
            </button>
          </div>
        </section>

        <section className="setting-card">
          <h3>Accent Color</h3>
          <p className="setting-desc">Set the primary accent color for active states and highlights.</p>
          <div className="color-picker-row">
            {accentPresets.map(color => (
              <button
                key={color}
                className={`color-dot ${preferences.accentColor === color ? "active" : ""}`}
                style={{ background: color }}
                onClick={() => set("accentColor", color)}
              />
            ))}
            <label className="color-custom-input">
              <input
                type="color"
                value={preferences.accentColor}
                onChange={e => set("accentColor", e.target.value)}
              />
              <span>{preferences.accentColor}</span>
            </label>
          </div>
        </section>

        <section className="setting-card">
          <h3>Text Size</h3>
          <p className="setting-desc">Adjust the editor font size for comfortable reading.</p>
          <div className="segment-control">
            {(["small", "medium", "large"] as const).map(size => (
              <button
                key={size}
                className={preferences.fontSize === size ? "chosen" : ""}
                onClick={() => set("fontSize", size)}
              >
                {size}
              </button>
            ))}
          </div>
        </section>

        <section className="setting-card">
          <h3>Line Width</h3>
          <p className="setting-desc">Set the maximum reading width of your note content.</p>
          <div className="segment-control">
            {(["compact", "comfortable", "wide"] as const).map(width => (
              <button
                key={width}
                className={preferences.lineWidth === width ? "chosen" : ""}
                onClick={() => set("lineWidth", width)}
              >
                {width}
              </button>
            ))}
          </div>
        </section>

        <section className="setting-card">
          <h3>Shortcuts</h3>
          <div className="shortcut-list">
            <div className="shortcut-item"><span>New Note</span><kbd>⌘N</kbd></div>
            <div className="shortcut-item"><span>Search Notes</span><kbd>⌘K</kbd></div>
            <div className="shortcut-item"><span>Bold Text</span><kbd>⌘B</kbd></div>
            <div className="shortcut-item"><span>Italic Text</span><kbd>⌘I</kbd></div>
            <div className="shortcut-item"><span>Underline Text</span><kbd>⌘U</kbd></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SearchDialog({ query, setQuery, notes, onClose, onSelect }: { query: string; setQuery(v: string): void; notes: Note[]; onClose(): void; onSelect(note: Note): void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const matches = notes
    .filter(note =>
      `${noteTitle(note)} ${note.subtitle || ""} ${(note.tags || []).join(" ")} ${cleanText(note.body)}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    .slice(0, 10);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-header">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes, tags, or content..."
          />
          <button className="icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="search-results">
          {matches.length > 0 ? (
            matches.map(note => (
              <button key={note.id} className="search-result-item" onClick={() => onSelect(note)}>
                <FileText size={16} />
                <div className="result-text">
                  <div className="result-title">{noteTitle(note)}</div>
                  <div className="result-snippet">{note.subtitle || cleanText(note.body) || "Empty note"}</div>
                </div>
                <time>{formatDate(note.updatedAt)}</time>
              </button>
            ))
          ) : (
            <div className="search-empty">No matching notes found</div>
          )}
        </div>
      </div>
    </div>
  );
}
