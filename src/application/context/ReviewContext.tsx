import { createContext } from "use-context-selector";
import type { ReviewContextType } from "./types";
export const ReviewContext = createContext<ReviewContextType | null>(null);
