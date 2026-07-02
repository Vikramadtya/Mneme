export const AppTab = {
  AGENDA: "agenda",
  BOOKS: "books",
  COURSES: "courses",
  ANALYTICS: "analytics",
  GRAPH: "graph",
  PROJECT: "project",
  TODAY: "today",
} as const;

export type AppTab = (typeof AppTab)[keyof typeof AppTab];
