import { createContext } from "use-context-selector";
import type { UIContextType } from "./types";
export const UIContext = createContext<UIContextType | null>(null);
