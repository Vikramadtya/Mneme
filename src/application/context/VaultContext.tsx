import { createContext } from "use-context-selector";
import type { VaultContextType } from "./types";
export const VaultContext = createContext<VaultContextType | null>(null);
