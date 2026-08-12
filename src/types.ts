export type Folder = "inbox" | "notes" | "archive" | "trash";

export interface NoteCover {
  type: "color" | "gradient";
  value: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  folder: Folder;
  subtitle?: string;
  icon?: string;
  cover?: NoteCover | null;
  tags?: string[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface Preferences {
  theme: "system" | "light" | "dark";
  fontSize: "small" | "medium" | "large";
  lineWidth: "compact" | "comfortable" | "wide";
  accentColor: string;
}

export interface AppData {
  notes: Note[];
  preferences: Preferences;
}
