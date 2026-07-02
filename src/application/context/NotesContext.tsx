import { createContext } from "use-context-selector";
import type { NotesContextType } from "./types";
export const NotesContext = createContext<NotesContextType | null>(null);
