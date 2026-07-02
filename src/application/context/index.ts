export { AppProvider } from "./AppProvider";

import { VaultContext } from "./VaultContext";
import { NotesContext } from "./NotesContext";
import { UIContext } from "./UIContext";
import { ReviewContext } from "./ReviewContext";
import { useContextSelector } from "use-context-selector";
import type {
  VaultContextType,
  NotesContextType,
  UIContextType,
  ReviewContextType,
} from "./types";

export function useVault<T = VaultContextType>(
  selector?: (state: VaultContextType) => T,
): T {
  return useContextSelector(VaultContext, selector || ((s: any) => s)) as T;
}

export function useNotes<T = NotesContextType>(
  selector?: (state: NotesContextType) => T,
): T {
  return useContextSelector(NotesContext, selector || ((s: any) => s)) as T;
}

export function useUI<T = UIContextType>(
  selector?: (state: UIContextType) => T,
): T {
  return useContextSelector(UIContext, selector || ((s: any) => s)) as T;
}

export function useReview<T = ReviewContextType>(
  selector?: (state: ReviewContextType) => T,
): T {
  return useContextSelector(ReviewContext, selector || ((s: any) => s)) as T;
}
