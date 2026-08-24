import { z } from "zod";

export const FlashcardDataSchema = z.object({
  question: z.string(),
  answer: z.string(),
  nextReviewDate: z.string().nullable(),
  interval: z.number(),
  easeFactor: z.number(),
  repetition: z.number(),
});

export const NoteSchema = z.object({
  id: z.string(),
  project_id: z.string().optional(),
  chapterId: z.string().optional(),
  title: z.string(),
  date: z.string(),
  time: z.string(),
  tags: z.array(z.string()),
  content: z.string().optional(),
  flashcard: FlashcardDataSchema.optional(),
  favourite: z.boolean().optional(),
  sort_order: z.number().optional(),
  metadata: z.any().optional(),
  ai_summary: z.string().optional(),
  ai_summary_hash: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["book", "course", "chapter"]),
  color: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  sort_order: z.number().optional(),
  chapters: z.lazy(() => z.array(ProjectSchema)).optional(),
  author: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  pdf_path: z.string().nullable().optional(),
  instructor: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  is_archived: z.number().optional(),
});

export const VaultSettingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  dailyGoal: z.number(),
  gitRemoteUrl: z.string().optional(),
  gitGithubToken: z.string().optional(),
  gitBranch: z.string().optional(),
  autoSave: z.boolean().optional(),
  githubToken: z.string().optional(),
  gitAuthorName: z.string().optional(),
  gitAuthorEmail: z.string().optional(),
  aiSummaryModel: z.string().optional(),
  aiTagModel: z.string().optional(),
  aiEnabled: z.string().optional(),
  llmType: z.enum(["local", "cloud"]).optional(),
  aiTemperature: z.number().optional(),
  aiMaxTokens: z.number().optional(),
  aiRepetitionPenalty: z.number().optional(),
  openAiKey: z.string().optional(),
  anthropicKey: z.string().optional(),
  geminiKey: z.string().optional(),
  autoFormatOnSave: z.string().optional(),
});
