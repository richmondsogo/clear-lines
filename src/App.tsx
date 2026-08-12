import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import {
  Archive, ChevronDown, FileText, FolderOpen, Inbox, Menu, Moon, MoreHorizontal,
  PanelLeftClose, Palette, Plus, RotateCcw, Search, Settings, Sun, Tag, Trash2, X
} from "lucide-react";
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
  inbox: { label: "Inbox", icon: Inbox }, notes: { label: "Notes", icon: FileText },
  archive: { label: "Archive", icon: Archive }, trash: { label: "Trash", icon: Trash2 }
};

const makeNote = (): Note => ({
  id: crypto.randomUUID(), title: "", subtitle: "", icon: "✦", body: "", folder: "inbox", tags: [], cover: { type: "gradient", value: "linear-gradient(135deg, #54755e, #b9d6b5)" }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), deletedAt: null
});

const coverPresets: NoteCover[] = [
  { type: "color", value: "#d8e7df" }, { type: "color", value: "#ebe0ce" }, { type: "color", value: "#d9e2f1" }, { type: "color", value: "#ebd9df" },
  { type: "gradient", value: "linear-gradient(135deg, #54755e, #b9d6b5)" }, { type: "gradient", value: "linear-gradient(135deg, #6e799a, #d5c8ee)" },
  { type: "gradient", value: "linear-gradient(135deg, #bd765c, #f1cda0)" }, { type: "gradient", value: "linear-gradient(135deg, #426b77, #b9dfe1)" }
];
const emojis = ["✦", "✎", "☼", "☕", "⌁", "❋", "☁", "♡", "◆", "✿"];

function formatDate(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(date));
}

export default function App() {
  const initial = useMemo(loadData, []);
  const [notes, setNotes] = useState(initial.notes);
  const [preferences, setPreferences] = useState<Preferences>(initial.preferences);
  const [view, setView] = useState<View>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(initial.notes[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error">("saved");
  const editor = useRef<HTMLDivElement>(null);

  const selected = notes.find((note) => note.id === selectedId) ?? null;
  const visible = notes.filter(note => {
    const matchesView = view === "all" || note.folder === view;
    const haystack = `${noteTitle(note)} ${note.subtitle || ""} ${(note.tags || []).join(" ")} ${cleanText(note.body)}`.toLowerCase();
    return matchesView && haystack.includes(query.toLowerCase());
  }).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || +new Date(b.updatedAt) - +new Date(a.updatedAt));

  useEffect(() => {
    setSaveStatus("saving");
    const snapshot = { notes, preferences };
    const timeout = window.setTimeout(() => setSaveStatus(saveData(snapshot) ? "saved" : "error"), 600);
    return () => window.clearTimeout(timeout);
  }, [notes, preferences]);
  useEffect(() => {
    const flush = () => saveData({ notes, preferences });
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [notes, preferences]);
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.font = preferences.fontSize;
    document.documentElement.dataset.width = preferences.lineWidth;
    document.documentElement.style.setProperty("--accent", preferences.accentColor);
  }, [preferences]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") { event.preventDefault(); createNote(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setShowSearch(true); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  });

  function createNote() {
    const note = makeNote();
    setNotes(current => [note, ...current]); setSelectedId(note.id); setView("inbox"); setQuery("");
    setTimeout(() => document.getElementById("note-title")?.focus(), 0);
  }
  function updateNote(patch: Partial<Note>) {
    if (!selected) return;
    setNotes(current => current.map(note => note.id === selected.id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note));
  }
  function moveNote(folder: Folder) { updateNote({ folder, deletedAt: folder === "trash" ? new Date().toISOString() : null }); if (folder === "trash") setView("trash"); }
  function deleteForever() { if (!selected) return; setNotes(current => current.filter(note => note.id !== selected.id)); setSelectedId(visible.find(note => note.id !== selected.id)?.id ?? null); }
  function chooseView(next: View) { setView(next); setQuery(""); if (next !== "settings") setSelectedId(null); }
  const counts = (folder: Folder) => notes.filter(note => note.folder === folder).length;

  return <main className={`app ${sidebarOpen ? "" : "sidebar-hidden"}`}>
    <aside className="sidebar" aria-label="Navigation">
      <div className="brand"><div className="brand-mark" /><span>Clear Lines</span><button className="icon-button desktop-only" onClick={() => setSidebarOpen(false)} aria-label="Collapse sidebar"><PanelLeftClose size={18}/></button></div>
      <button className="new-note" onClick={createNote}><Plus size={18}/><span>New note</span><kbd>⌘ N</kbd></button>
      <nav>
        <Nav icon={FolderOpen} label="All notes" active={view === "all"} count={notes.filter(n => n.folder !== "trash").length} onClick={() => chooseView("all")} />
        {(Object.keys(folderMeta) as Folder[]).map(folder => <Nav key={folder} icon={folderMeta[folder].icon} label={folderMeta[folder].label} active={view === folder} count={counts(folder)} onClick={() => chooseView(folder)} />)}
      </nav>
      <div className="sidebar-bottom"><button className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => chooseView("settings")}><Settings size={18}/><span>Settings</span></button><p>Made for clear thinking.</p></div>
    </aside>
    <section className="content">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><h1>{view === "settings" ? "Settings" : view === "all" ? "All notes" : folderMeta[view].label}</h1><div className="top-actions"><button className="search-button" onClick={() => setShowSearch(true)}><Search size={17}/><span>Search</span><kbd>⌘ K</kbd></button><button className="icon-button" onClick={createNote} aria-label="Create note"><Plus size={20}/></button></div></header>
      {view === "settings" ? <SettingsPanel preferences={preferences} setPreferences={setPreferences} /> : <div className="workspace">
        <section className="note-list" aria-label="Notes"><div className="list-heading"><span>{visible.length} {visible.length === 1 ? "note" : "notes"}</span><button className="icon-button" onClick={createNote} aria-label="New note"><Plus size={18}/></button></div>{visible.length ? visible.map(note => <NoteCard key={note.id} note={note} selected={note.id === selectedId} onClick={() => setSelectedId(note.id)} />) : <div className="empty-list"><FileText size={24}/><p>No notes here yet.</p><button onClick={createNote}>Create a note</button></div>}</section>
        <Editor note={selected} editorRef={editor} onUpdate={updateNote} onMove={moveNote} onDelete={deleteForever} />
      </div>}
    </section>
    <p className={`save-status ${saveStatus}`} role="status">{saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Could not save locally" : "Saved"}</p>
    {showSearch && <SearchDialog query={query} setQuery={setQuery} notes={notes} onClose={() => setShowSearch(false)} onSelect={note => { setSelectedId(note.id); setView(note.folder); setShowSearch(false); }} />}
  </main>;
}

function Nav({ icon: Icon, label, active, count, onClick }: { icon: typeof Inbox; label: string; active: boolean; count?: number; onClick(): void }) { return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}><Icon size={18}/><span>{label}</span>{count !== undefined && <em>{count}</em>}</button>; }
function NoteCard({ note, selected, onClick }: { note: Note; selected: boolean; onClick(): void }) { return <button className={`note-card ${selected ? "selected" : ""}`} onClick={onClick}><span className="note-thumbnail" style={note.cover ? { background: note.cover.value } : undefined}>{note.icon || "✦"}</span><div><strong>{noteTitle(note)}</strong><p>{note.subtitle || cleanText(note.body) || "No additional text"}</p>{note.tags?.length ? <small>{note.tags.slice(0, 2).map(tag => `#${tag}`).join(" ")}</small> : null}</div><time>{formatDate(note.updatedAt)}</time>{note.pinned && <span className="pin">•</span>}</button>; }

function Editor({ note, editorRef, onUpdate, onMove, onDelete }: { note: Note | null; editorRef: RefObject<HTMLDivElement>; onUpdate(patch: Partial<Note>): void; onMove(folder: Folder): void; onDelete(): void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!note) return <article className="editor empty-editor"><div><div className="empty-orb"><FileText size={28}/></div><h2>Select a note</h2><p>Choose a note from the list, or create a new one to begin.</p><button className="primary-button" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", ctrlKey: true }))}><Plus size={17}/> New note</button></div></article>;
  return <article className="editor"><div className="editor-meta"><span>{formatDate(note.updatedAt)} · {cleanText(note.body).split(/\s+/).filter(Boolean).length} words</span><div className="menu-wrap"><button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Note actions"><MoreHorizontal size={20}/></button>{menuOpen && <div className="note-menu"><button onClick={() => { onUpdate({ pinned: !note.pinned }); setMenuOpen(false); }}>{note.pinned ? "Unpin note" : "Pin note"}</button>{note.folder !== "archive" && note.folder !== "trash" && <button onClick={() => { onMove("archive"); setMenuOpen(false); }}>Archive note</button>}{note.folder === "trash" ? <><button onClick={() => { onMove("inbox"); setMenuOpen(false); }}><RotateCcw size={14}/> Restore to inbox</button><button className="danger" onClick={onDelete}>Delete forever</button></> : <button className="danger" onClick={() => { onMove("trash"); setMenuOpen(false); }}>Move to trash</button>}</div>}</div></div><NoteCover note={note} onUpdate={onUpdate}/><input id="note-title" value={note.title} placeholder="Untitled note" onChange={event => onUpdate({ title: event.target.value })} aria-label="Note title"/><input className="note-subtitle" value={note.subtitle || ""} placeholder="Add a subtitle…" onChange={event => onUpdate({ subtitle: event.target.value })} aria-label="Note subtitle"/><TiptapEditor key={note.id} content={note.body} onUpdate={body => onUpdate({ body })}/></article>;
}

function NoteCover({ note, onUpdate }: { note: Note; onUpdate(patch: Partial<Note>): void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#/, "");
    if (tag && !(note.tags || []).some(value => value.toLowerCase() === tag.toLowerCase())) onUpdate({ tags: [...(note.tags || []), tag] });
    setTagDraft("");
  };
  return <section className="note-cover" style={note.cover ? { background: note.cover.value } : undefined}>
    <button className="cover-picker" onClick={() => setPickerOpen(open => !open)} aria-expanded={pickerOpen}><Palette size={15}/> Change cover</button>
    {pickerOpen && <div className="cover-popover"><strong>Cover</strong><div className="cover-options">{coverPresets.map((cover, index) => <button key={`${cover.value}-${index}`} className="cover-swatch" style={{ background: cover.value }} onClick={() => { onUpdate({ cover }); setPickerOpen(false); }} aria-label={`Use cover ${index + 1}`}/>)}</div><button className="clear-cover" onClick={() => { onUpdate({ cover: null }); setPickerOpen(false); }}>Remove cover</button></div>}
    <div className="emoji-row" aria-label="Choose note icon">{emojis.map(emoji => <button key={emoji} className={note.icon === emoji ? "active" : ""} onClick={() => onUpdate({ icon: emoji })}>{emoji}</button>)}</div>
    <div className="cover-icon" aria-hidden="true">{note.icon || "✦"}</div>
    <div className="tag-editor"><Tag size={14}/>{(note.tags || []).map(tag => <span className="tag-chip" key={tag}>#{tag}<button aria-label={`Remove ${tag} tag`} onClick={() => onUpdate({ tags: (note.tags || []).filter(value => value !== tag) })}>×</button></span>)}<input value={tagDraft} onChange={event => setTagDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="Add tag" aria-label="Add tag"/></div>
  </section>;
}

function TiptapEditor({ content, onUpdate }: { content: string; onUpdate(value: string): void }) {
  const editor = useEditor({ extensions: [StarterKit, Underline, Highlight, TaskList, TaskItem.configure({ nested: true }), Link.configure({ openOnClick: false })], content, editorProps: { attributes: { class: "editable", "data-placeholder": "Start writing…" } }, onUpdate: ({ editor: instance }) => onUpdate(instance.getHTML()) });
  if (!editor) return null;
  const action = (callback: () => void) => (event: MouseEvent) => { event.preventDefault(); callback(); };
  return <><div className="format-toolbar" aria-label="Formatting controls"><button title="Bold" onMouseDown={action(() => editor.chain().focus().toggleBold().run())}><b>B</b></button><button title="Italic" onMouseDown={action(() => editor.chain().focus().toggleItalic().run())}><i>I</i></button><button title="Underline" onMouseDown={action(() => editor.chain().focus().toggleUnderline().run())}><u>U</u></button><button title="Strike through" onMouseDown={action(() => editor.chain().focus().toggleStrike().run())}>S̶</button><button title="Bulleted list" onMouseDown={action(() => editor.chain().focus().toggleBulletList().run())}>• List</button><button title="Checklist" onMouseDown={action(() => editor.chain().focus().toggleTaskList().run())}>☐ Tasks</button><button title="Undo" onMouseDown={action(() => editor.chain().focus().undo().run())}>↶</button><button title="Redo" onMouseDown={action(() => editor.chain().focus().redo().run())}>↷</button></div><EditorContent editor={editor}/></>;
}

function SettingsPanel({ preferences, setPreferences }: { preferences: Preferences; setPreferences: Dispatch<SetStateAction<Preferences>> }) { const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setPreferences(p => ({ ...p, [key]: value })); return <div className="settings-panel"><section><h2>Appearance</h2><p>Choose a calm reading environment that feels right to you.</p><Setting label="Theme" description="Set how Clear Lines looks."><Segment options={["system", "light", "dark"]} value={preferences.theme} onChange={v => set("theme", v as Preferences["theme"])} icons={{ system: <Settings size={16}/>, light: <Sun size={16}/>, dark: <Moon size={16}/> }}/></Setting><Setting label="Accent colour" description="Tint active states and highlights."><label className="color-input"><input type="color" value={preferences.accentColor} onChange={event => set("accentColor", event.target.value)} aria-label="Accent colour"/><span>{preferences.accentColor}</span></label></Setting><Setting label="Text size" description="Adjust the size of your writing and notes."><Segment options={["small", "medium", "large"]} value={preferences.fontSize} onChange={v => set("fontSize", v as Preferences["fontSize"])} /></Setting><Setting label="Line width" description="Control the measure of the editor."><Segment options={["compact", "comfortable", "wide"]} value={preferences.lineWidth} onChange={v => set("lineWidth", v as Preferences["lineWidth"])} /></Setting></section><section><h2>Keyboard shortcuts</h2><div className="shortcuts"><span>New note <kbd>⌘ N</kbd></span><span>Search notes <kbd>⌘ K</kbd></span><span>Editor formatting <kbd>⌘ B / I / U</kbd></span></div></section></div>; }
function Setting({ label, description, children }: { label: string; description: string; children: ReactNode }) { return <div className="setting"><div><h3>{label}</h3><p>{description}</p></div>{children}</div>; }
function Segment({ options, value, onChange, icons }: { options: string[]; value: string; onChange(value: string): void; icons?: Record<string, ReactNode> }) { return <div className="segment">{options.map(option => <button key={option} className={value === option ? "chosen" : ""} onClick={() => onChange(option)}>{icons?.[option]}{option}</button>)}</div>; }
function SearchDialog({ query, setQuery, notes, onClose, onSelect }: { query: string; setQuery(v: string): void; notes: Note[]; onClose(): void; onSelect(note: Note): void }) { const input = useRef<HTMLInputElement>(null); useEffect(() => input.current?.focus(), []); const matches = notes.filter(note => `${noteTitle(note)} ${note.subtitle || ""} ${(note.tags || []).join(" ")} ${cleanText(note.body)}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8); return <div className="dialog-backdrop" onMouseDown={onClose}><div className="search-dialog" onMouseDown={e => e.stopPropagation()}><div><Search size={19}/><input ref={input} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search your notes…" aria-label="Search notes"/><button className="icon-button" onClick={onClose}><X size={18}/></button></div><section>{matches.length ? matches.map(note => <button key={note.id} onClick={() => onSelect(note)}><FileText size={17}/><span><strong>{noteTitle(note)}</strong><small>{note.subtitle || cleanText(note.body) || "Empty note"}</small></span><time>{formatDate(note.updatedAt)}</time></button>) : <p>No matching notes.</p>}</section></div></div>; }
