import type { AppData, Note, Preferences } from "./types";

const KEY = "clear-lines:data:v1";

export const defaultPreferences: Preferences = {
  theme: "system", fontSize: "medium", lineWidth: "comfortable", accentColor: "#54755e"
};

const starterNote: Note = {
  id: "welcome",
  title: "Welcome to Clear Lines",
  body: "<p>A quiet place to think, write, and keep the important things close.</p><p>Start with a thought. Your notes are saved automatically on this device.</p>",
  folder: "inbox",
  icon: "✦",
  cover: { type: "gradient", value: "linear-gradient(135deg, #54755e, #b9d6b5)" },
  tags: ["Welcome"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pinned: true
};

function normaliseNote(note: Partial<Note>): Note {
  const now = new Date().toISOString();
  return {
    id: note.id || crypto.randomUUID(),
    title: note.title || "",
    body: note.body || "",
    folder: note.folder || "inbox",
    subtitle: note.subtitle || "",
    icon: note.icon || "✦",
    cover: note.cover ?? null,
    tags: Array.isArray(note.tags) ? note.tags.filter(Boolean) : [],
    deletedAt: note.deletedAt ?? null,
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || now,
    pinned: Boolean(note.pinned)
  };
}

export function loadData(): AppData {
  try {
    const data = localStorage.getItem(KEY);
    if (data) {
      const parsed = JSON.parse(data) as Partial<AppData>;
      if (Array.isArray(parsed.notes)) return {
        notes: parsed.notes.map(normaliseNote),
        preferences: { ...defaultPreferences, ...parsed.preferences }
      };
    }
  } catch { /* Reset corrupted local application data. */ }
  return { notes: [starterNote], preferences: defaultPreferences };
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function cleanText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function noteTitle(note: Pick<Note, "title" | "body">) {
  return note.title.trim() || cleanText(note.body).slice(0, 60) || "Untitled note";
}
