export type Folder = "inbox" | "notes" | "archive" | "trash";

export interface Note {
  id: string;
  title: string;
  body: string;
  folder: Folder;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface Preferences {
  theme: "system" | "light" | "dark";
  fontSize: "small" | "medium" | "large";
  lineWidth: "compact" | "comfortable" | "wide";
}

export interface AppData {
  notes: Note[];
  preferences: Preferences;
}
