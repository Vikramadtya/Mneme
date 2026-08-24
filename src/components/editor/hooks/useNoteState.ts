import { useState, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ipcClient } from "@/api/ipcClient";
import { useVault, useUI } from "../../../application/context";

export function useNoteState(note: any) {
  const vaultPath = useVault((s) => s.vaultPath);
  const editingNoteId = useUI((s) => s.editingNoteId);
  const editNoteContent = useUI((s) => s.editNoteContent);
  const setEditNoteContent = useUI((s) => s.setEditNoteContent);
  const saveEdit = useUI((s) => s.saveEdit);
  const uiShowToast = useUI((s) => s.showToast);

  const [localContent, setLocalContent] = useState(editNoteContent);
  const [viewContent, setViewContent] = useState(note.content || "");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Lazy-load content for read mode
  useEffect(() => {
    if (vaultPath && note.id) {
      setIsLoadingContent(true);
      setViewContent(note.content || "");
      ipcClient.db.getNoteContent(vaultPath, note.id).then((res: any) => {
        if (res.success && typeof res.data === "string") {
          setViewContent(res.data);
        }
        setIsLoadingContent(false);
      });
    }
  }, [note.id, vaultPath]);

  // Sync upstream on edit mode start
  useEffect(() => {
    if (editingNoteId === note.id) {
      setLocalContent(editNoteContent);
      if (editNoteContent) {
        setViewContent(editNoteContent);
      }
    }
  }, [editNoteContent, editingNoteId, note.id]);

  const debouncedSetEditNoteContent = useDebouncedCallback((val) => {
    setEditNoteContent(val);
  }, 150);

  const localContentRef = useRef(localContent);
  useEffect(() => {
    localContentRef.current = localContent;
  }, [localContent]);

  const debouncedSave = useDebouncedCallback(() => {
    saveEdit(false, localContentRef.current);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, 1000);

  // Keyboard shortcut for Save (Cmd+S)
  useEffect(() => {
    if (editingNoteId !== note.id) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        debouncedSave.cancel();
        saveEdit(false, localContentRef.current);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingNoteId, note.id, debouncedSave, saveEdit]);

  const editNoteTitle = useUI((s) => s.editNoteTitle);
  const editNoteTags = useUI((s) => s.editNoteTags);
  const editFlashcardQ = useUI((s) => s.editFlashcardQ);
  const editFlashcardA = useUI((s) => s.editFlashcardA);

  // Auto-save on metadata change
  useEffect(() => {
    if (!editingNoteId) return;
    debouncedSave();
  }, [
    editNoteTitle,
    localContent,
    editNoteTags,
    editFlashcardQ,
    editFlashcardA,
    editingNoteId,
    debouncedSave,
  ]);

  // Flush on unmount
  useEffect(() => {
    const handleBeforeUnload = () => debouncedSave.flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      debouncedSave.flush();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [debouncedSave]);

  const handleContentChange = (val: string) => {
    setLocalContent(val);
    debouncedSetEditNoteContent(val);
    debouncedSave();
  };

  const saveAndClose = () => {
    debouncedSave.cancel();
    setViewContent(localContent);
    saveEdit(true, localContent);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  return {
    localContent,
    viewContent,
    isLoadingContent,
    showToast,
    handleContentChange,
    saveAndClose,
  };
}
