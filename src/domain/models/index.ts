export interface FlashcardData {
  question: string;
  answer: string;
  nextReviewDate: string | null;
  interval: number;
  easeFactor: number;
  repetition: number;
}

export interface Note {
  id: string;
  project_id?: string;
  chapterId?: string;
  title: string;
  date: string;
  time: string;
  tags: string[];
  content?: string; // Content is often lazy-loaded
  flashcard?: FlashcardData;
  favourite?: boolean;
  sort_order?: number;
  metadata?: any;
  ai_summary?: string;
  ai_summary_hash?: string;
}

export interface Chapter {
  id: string;
  name: string;
  type: "chapter";
  parent_id: string;
}

export interface Project {
  id: string;
  name: string;
  type: "book" | "course" | "chapter";
  color: string;
  parent_id?: string | null;
  sort_order?: number;
  chapters?: Project[];
  author?: string | null;
  url?: string | null;
  pdf_path?: string | null;
  instructor?: string | null;
  platform?: string | null;
  is_archived?: number;
}

export interface ActivityLog {
  date: string;
  count: number;
}

export interface VaultSettings {
  theme: "system" | "light" | "dark";
  dailyGoal: number;
  gitRemoteUrl?: string;
  gitGithubToken?: string;
  gitBranch?: string;
  githubActions?: boolean;
  autoSave?: boolean;
  githubToken?: string;
  githubActionsEnabled?: boolean;
  gitAuthorName?: string;
  gitAuthorEmail?: string;
  aiSummaryModel?: string;
  aiTagModel?: string;
  aiEnabled?: string;
  llmType?: "local" | "cloud";
  aiTemperature?: number;
  aiMaxTokens?: number;
  aiRepetitionPenalty?: number;
  openAiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  autoFormatOnSave?: string;
}

export interface Commit {
  hash: string;
  date: string;
  message: string;
  author_name: string;
}
