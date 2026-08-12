import type { AppData, Note, Preferences } from "./types";

const KEY = "clear-lines:data:v1";

export const defaultPreferences: Preferences = {
  theme: "system", fontSize: "medium", lineWidth: "comfortable"
};

const starterNote: Note = {
  id: "welcome",
  title: "Welcome to Clear Lines",
  body: "<p>A quiet place to think, write, and keep the important things close.</p><p>Start with a thought. Your notes are saved automatically on this device.</p>",
  folder: "inbox",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pinned: true
};

export function loadData(): AppData {
  try {
    const data = localStorage.getItem(KEY);
    if (data) {
      const parsed = JSON.parse(data) as Partial<AppData>;
      if (Array.isArray(parsed.notes)) return { notes: parsed.notes, preferences: { ...defaultPreferences, ...parsed.preferences } };
    }
  } catch { /* Reset corrupted local application data. */ }
  return { notes: [starterNote], preferences: defaultPreferences };
}

export function saveData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function cleanText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function noteTitle(note: Pick<Note, "title" | "body">) {
  return note.title.trim() || cleanText(note.body).slice(0, 60) || "Untitled note";
}
