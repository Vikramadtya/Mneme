import { getDb, runDb } from "../../ipcHandlers";

export const NoteRepository = {
  getNoteById: (id: string) => {
    return getDb("SELECT * FROM notes WHERE id = ?", [id])[0];
  },

  getNoteTitleAndProject: (id: string) => {
    return getDb("SELECT title, project_id FROM notes WHERE id = ?", [id])[0];
  },

  getAllNotes: () => {
    return getDb("SELECT * FROM notes");
  },

  saveNote: async (note: any, projId: string) => {
    await runDb(
      "INSERT OR REPLACE INTO notes (id, project_id, title, date, time, tags, ai_summary, ai_summary_hash, favourite, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        note.id,
        projId,
        note.title,
        note.date,
        note.time,
        JSON.stringify(note.tags || []),
        note.ai_summary || null,
        note.ai_summary_hash || null,
        note.favourite ? 1 : 0,
        note.sort_order || 0,
      ],
    );
  },

  saveFlashcard: async (noteId: string, flashcard: any) => {
    await runDb(
      "INSERT OR REPLACE INTO flashcards (id, note_id, question, answer, next_review, interval, ease, repetition) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        noteId + "_fc",
        noteId,
        flashcard.question,
        flashcard.answer,
        flashcard.nextReviewDate,
        flashcard.interval,
        flashcard.easeFactor,
        flashcard.repetition,
      ],
    );
  },

  deleteFlashcardsByNoteId: async (noteId: string) => {
    await runDb("DELETE FROM flashcards WHERE note_id = ?", [noteId]);
  },

  saveNoteFts: async (id: string, title: string, content: string) => {
    await runDb(
      "INSERT OR REPLACE INTO notes_fts (id, title, content) VALUES (?, ?, ?)",
      [id, title, content],
    );
  },

  deleteNote: async (id: string) => {
    await runDb("DELETE FROM notes WHERE id = ?", [id]);
  },

  searchNotes: async (query: string) => {
    return await getDb(
      `SELECT notes.*, snippet(notes_fts, 2, '<b>', '</b>', '...', 10) as snippet 
       FROM notes_fts 
       JOIN notes ON notes.id = notes_fts.id 
       WHERE notes_fts MATCH ? 
       ORDER BY rank LIMIT 50`,
      [query],
    );
  },

  getAllFlashcards: () => {
    return getDb("SELECT * FROM flashcards");
  },

  deleteNotesByChapterId: async (chapterId: string) => {
    await runDb("DELETE FROM notes WHERE project_id = ?", [chapterId]);
  },

  deleteNotesByParentProjectId: async (projectId: string) => {
    await runDb(
      "DELETE FROM notes WHERE project_id IN (SELECT id FROM projects WHERE parent_id = ?)",
      [projectId],
    );
  },

  beginTransaction: async () => {
    await runDb("BEGIN TRANSACTION");
  },

  commitTransaction: async () => {
    await runDb("COMMIT");
  },

  rollbackTransaction: async () => {
    await runDb("ROLLBACK");
  },
};
