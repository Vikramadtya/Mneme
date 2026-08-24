import type Database from "better-sqlite3";

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    up: (db) => {
      db.exec(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        color TEXT,
        parent_id TEXT
      )`);

      db.exec(`CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT,
        date TEXT,
        time TEXT,
        tags TEXT
      )`);

      db.exec(`CREATE TABLE IF NOT EXISTS flashcards (
        id TEXT PRIMARY KEY,
        note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        next_review TEXT,
        interval INTEGER,
        ease REAL,
        repetition INTEGER
      )`);

      db.exec(`CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        date TEXT,
        action TEXT,
        count INTEGER DEFAULT 1
      )`);

      db.exec(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);
    },
  },
  {
    version: 2,
    name: "add_project_columns",
    up: (db) => {
      const projectCols = db.pragma("table_info(projects)") as any[];
      if (!projectCols.some((r) => r.name === "sort_order")) {
        db.exec("ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0");
      }
      // parent_id was in initial_schema but some users might have an older version where it wasn't
      if (!projectCols.some((r) => r.name === "parent_id")) {
        db.exec("ALTER TABLE projects ADD COLUMN parent_id TEXT");
      }
      if (!projectCols.some((r) => r.name === "author")) {
        db.exec("ALTER TABLE projects ADD COLUMN author TEXT");
      }
      if (!projectCols.some((r) => r.name === "url")) {
        db.exec("ALTER TABLE projects ADD COLUMN url TEXT");
      }
      if (!projectCols.some((r) => r.name === "pdf_path")) {
        db.exec("ALTER TABLE projects ADD COLUMN pdf_path TEXT");
      }
      if (!projectCols.some((r) => r.name === "instructor")) {
        db.exec("ALTER TABLE projects ADD COLUMN instructor TEXT");
      }
      if (!projectCols.some((r) => r.name === "platform")) {
        db.exec("ALTER TABLE projects ADD COLUMN platform TEXT");
      }
    },
  },
  {
    version: 3,
    name: "add_performance_indexes",
    up: (db) => {
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id)`,
      );
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_flashcards_note_id ON flashcards(note_id)`,
      );
      db.exec(`CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)`);
    },
  },
  {
    version: 4,
    name: "add_fts5_notes",
    up: (db) => {
      // Create FTS5 virtual table. We use unindexed id since we only search title and content
      db.exec(
        `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id UNINDEXED, title, content, tokenize='trigram');`,
      );
    },
  },
  {
    version: 5,
    name: "add_vault_path_to_settings",
    up: (db) => {
      // Nothing needed, handled in app
    },
  },
  {
    version: 6,
    name: "add_is_archived_to_projects",
    up: (db) => {
      const projectCols = db.pragma("table_info(projects)") as any[];
      if (!projectCols.some((r) => r.name === "is_archived")) {
        db.exec(
          "ALTER TABLE projects ADD COLUMN is_archived INTEGER DEFAULT 0",
        );
      }
    },
  },
  {
    version: 7,
    name: "add_ai_summary_to_notes",
    up: (db) => {
      const noteCols = db.pragma("table_info(notes)") as any[];
      if (!noteCols.some((r) => r.name === "ai_summary")) {
        db.exec("ALTER TABLE notes ADD COLUMN ai_summary TEXT");
      }
      if (!noteCols.some((r) => r.name === "ai_summary_hash")) {
        db.exec("ALTER TABLE notes ADD COLUMN ai_summary_hash TEXT");
      }
    },
  },
  {
    version: 8,
    name: "add_favourite_to_notes",
    up: (db) => {
      const noteCols = db.pragma("table_info(notes)") as any[];
      if (!noteCols.some((r) => r.name === "favourite")) {
        db.exec("ALTER TABLE notes ADD COLUMN favourite INTEGER DEFAULT 0");
      }
    },
  },
  {
    version: 9,
    name: "cleanup_invalid_activity_logs",
    up: (db) => {
      // Delete any activity logs where date is a file path (from previous bug)
      db.exec(
        "DELETE FROM activity_logs WHERE date LIKE '/%' OR date LIKE 'C:%'",
      );
    },
  },
  {
    version: 10,
    name: "add_sort_order_to_notes",
    up: (db) => {
      const notesSchema = db.pragma("table_info(notes)");
      const noteCols = Array.isArray(notesSchema) ? notesSchema : [notesSchema];
      if (!noteCols.some((r) => r.name === "sort_order")) {
        db.exec("ALTER TABLE notes ADD COLUMN sort_order INTEGER DEFAULT 0");
      }
    },
  },
];

export function runMigrations(db: Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const currentVersionRow = db
    .prepare("SELECT MAX(version) as version FROM schema_migrations")
    .get() as any;
  const currentVersion = currentVersionRow?.version || 0;

  const transaction = db.transaction(() => {
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(
          `Applying migration ${migration.version}: ${migration.name}`,
        );
        migration.up(db);
        db.prepare(
          "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
        ).run(migration.version, migration.name);
      }
    }
  });

  try {
    transaction();
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}
