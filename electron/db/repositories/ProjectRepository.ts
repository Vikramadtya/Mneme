import { getDb, runDb } from "../../ipcHandlers";

export const ProjectRepository = {
  getAllProjects: () => {
    return getDb("SELECT * FROM projects");
  },

  getProjectById: (id: string) => {
    return getDb("SELECT * FROM projects WHERE id = ?", [id])[0];
  },

  getProjectsByParentId: (parentId: string) => {
    return getDb("SELECT * FROM projects WHERE parent_id = ?", [parentId]);
  },

  saveProject: async (project: any) => {
    await runDb(
      "INSERT OR REPLACE INTO projects (id, name, type, color, parent_id, author, url, pdf_path, instructor, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        project.id,
        project.name,
        project.type,
        project.color,
        project.parent_id || null,
        project.author || null,
        project.url || null,
        project.pdf_path || null,
        project.instructor || null,
        project.platform || null,
      ],
    );
  },

  clearParentId: async (projectId: string) => {
    await runDb("UPDATE projects SET parent_id = NULL WHERE parent_id = ?", [
      projectId,
    ]);
  },

  deleteProject: async (id: string) => {
    await runDb("DELETE FROM projects WHERE id = ?", [id]);
  },

  archiveProject: async (id: string) => {
    await runDb("UPDATE projects SET is_archived = 1 WHERE id = ?", [id]);
  },

  unarchiveProject: async (id: string) => {
    await runDb("UPDATE projects SET is_archived = 0 WHERE id = ?", [id]);
  },

  deleteProjectsByParentId: async (parentId: string) => {
    await runDb("DELETE FROM projects WHERE parent_id = ?", [parentId]);
  },
};
