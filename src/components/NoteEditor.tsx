import { ipcClient } from "@/api/ipcClient";
import React, { useRef, useState, useEffect } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MemoriserEditor } from "./editor/MemoriserEditor";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  Circle,
  CheckCircle2,
  Star,
  Square,
  History,
  Edit2,
  Trash2,
  Save,
  X,
  Hash,
  Calendar,
  Bold,
  Italic,
  Underline,
  Code,
  Link,
  List,
  Layers,
  Sparkles,
} from "lucide-react";
import { useVault, useNotes, useUI, useReview } from "../application/context";
import { type Note } from "../domain/models";
import { preprocessMarkdown } from "../utils/markdownUtils";
import { Tooltip } from "./Tooltip";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { useDebounce, useDebouncedCallback } from "use-debounce";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

export function NoteEditor({ note }: { note: any }) {
  const vaultPath = useVault((s) => s.vaultPath);
  const vaultSettings = useVault((s) => s.vaultSettings);
  const setSplitPaneNoteId = useNotes((s) => s.setSplitPaneNoteId);
  const splitPaneNoteId = useNotes((s) => s.splitPaneNoteId);
  const handleDeleteNote = useNotes((s) => s.handleDeleteNote);
  const setActivePdf = useNotes((s) => s.setActivePdf);
  const allNotesFlat = useNotes((s) => s.allNotesFlat);
  const setFocusedNoteId = useNotes((s) => s.setFocusedNoteId);
  const editingNoteId = useUI((s) => s.editingNoteId);
  const setEditingNoteId = useUI((s) => s.setEditingNoteId);
  const editNoteTitle = useUI((s) => s.editNoteTitle);
  const setEditNoteTitle = useUI((s) => s.setEditNoteTitle);
  const editNoteContent = useUI((s) => s.editNoteContent);
  const setEditNoteContent = useUI((s) => s.setEditNoteContent);
  const editNoteTags = useUI((s) => s.editNoteTags);
  const setEditNoteTags = useUI((s) => s.setEditNoteTags);
  const editFlashcardQ = useUI((s) => s.editFlashcardQ);
  const setEditFlashcardQ = useUI((s) => s.setEditFlashcardQ);
  const editFlashcardA = useUI((s) => s.editFlashcardA);
  const setEditFlashcardA = useUI((s) => s.setEditFlashcardA);
  const saveEdit = useUI((s) => s.saveEdit);
  const toggleFavourite = useUI((s) => s.toggleFavourite);
  const setIsHistoryOpen = useUI((s) => s.setIsHistoryOpen);
  const uiShowToast = useUI((s) => s.showToast);
  const setActiveHistoryNote = useNotes((s) => s.setActiveHistoryNote);
  const setNoteHistory = useNotes((s) => s.setNoteHistory);

  const handleOpenHistory = async (note: Note) => {
    if (!vaultPath) {
      uiShowToast("No vault open", "error");
      return;
    }
    setActiveHistoryNote({ ...note, content: viewContent });
    setIsHistoryOpen(true);
    const res = await ipcClient.git.getFileHistory(vaultPath, note.id);
    if (res.success) {
      setNoteHistory(res.data || []);
    }
  };
  const startEditing = useUI((s) => s.startEditing);
  const toggleCard = useUI((s) => s.toggleCard);
  const handleDragOver = useUI((s) => s.handleDragOver);
  const handleDrop = useUI((s) => s.handleDrop);
  const revealedCards = useReview((s) => s.revealedCards);

  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [showToast, setShowToast] = useState(false);
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const [splitPreview, setSplitPreview] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  const [localContent, setLocalContent] = useState(editNoteContent);
  const [viewContent, setViewContent] = useState(note.content || "");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummaryPopup, setAiSummaryPopup] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleAIReadSummary = async () => {
    try {
      const currentHash = hashString(viewContent || "");
      if (note.ai_summary_hash === currentHash && note.ai_summary) {
        setAiSummaryPopup(note.ai_summary);
        return;
      }
      setIsGeneratingAI(true);
      uiShowToast(
        "Generating AI Summary (this may take a few seconds)...",
        "info",
      );
      const { aiClient } = await import("../ai/client");
      const model =
        vaultSettings.aiSummaryModel ||
        "onnx-community/SmolLM2-135M-Instruct-ONNX";
      const summary = await aiClient.generateSummary(
        viewContent,
        model,
        {
          temperature: vaultSettings.aiTemperature,
          max_new_tokens: vaultSettings.aiMaxTokens,
          repetition_penalty: vaultSettings.aiRepetitionPenalty,
        },
        {
          openAiKey: vaultSettings.openAiKey,
          anthropicKey: vaultSettings.anthropicKey,
          geminiKey: vaultSettings.geminiKey,
        },
      );
      if (summary) {
        setAiSummaryPopup(summary);
        const updatedNote = {
          ...note,
          ai_summary: summary,
          ai_summary_hash: currentHash,
        };
        delete updatedNote.content; // Prevent overwriting the file with empty string!
        if (vaultPath) {
          await ipcClient.db.saveNote(vaultPath, updatedNote);
          note.ai_summary = summary;
          note.ai_summary_hash = currentHash;
        }
      }
    } catch (e: any) {
      uiShowToast("AI Generation failed: " + e.message, "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAIGenerate = async (type: "summary" | "tags") => {
    try {
      setIsGeneratingAI(true);
      uiShowToast(
        `Generating AI ${type === "summary" ? "Summary" : "Tags"} (this may take a few seconds)...`,
        "info",
      );
      const { aiClient } = await import("../ai/client");

      if (type === "summary") {
        const currentHash = hashString(localContent || "");
        if (note.ai_summary_hash === currentHash && note.ai_summary) {
          setAiSummaryPopup(note.ai_summary);
          setIsGeneratingAI(false);
          return;
        }
        const model =
          vaultSettings.aiSummaryModel ||
          "onnx-community/SmolLM2-135M-Instruct-ONNX";
        const summary = await aiClient.generateSummary(
          localContent,
          model,
          {
            temperature: vaultSettings.aiTemperature,
            max_new_tokens: vaultSettings.aiMaxTokens,
            repetition_penalty: vaultSettings.aiRepetitionPenalty,
          },
          {
            openAiKey: vaultSettings.openAiKey,
            anthropicKey: vaultSettings.anthropicKey,
            geminiKey: vaultSettings.geminiKey,
          },
        );
        if (summary) {
          setAiSummaryPopup(summary);
          const updatedNote = {
            ...note,
            ai_summary: summary,
            ai_summary_hash: currentHash,
            content: localContent,
            title: editNoteTitle,
          };
          if (vaultPath) {
            await ipcClient.db.saveNote(vaultPath, updatedNote);
            note.ai_summary = summary;
            note.ai_summary_hash = currentHash;
          }
        }
      } else if (type === "tags") {
        const model =
          vaultSettings.aiTagModel ||
          "onnx-community/SmolLM2-135M-Instruct-ONNX";
        // Collect existing unique tags from the vault
        const existingTags = Array.from(
          new Set(
            allNotesFlat.flatMap((n) =>
              n.metadata?.tags
                ? n.metadata.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                : [],
            ),
          ),
        );

        const tags = await aiClient.generateTags(
          localContent,
          model,
          existingTags,
          {
            temperature: vaultSettings.aiTemperature,
            repetition_penalty: vaultSettings.aiRepetitionPenalty,
          },
          {
            openAiKey: vaultSettings.openAiKey,
            anthropicKey: vaultSettings.anthropicKey,
            geminiKey: vaultSettings.geminiKey,
          },
        );
        if (tags && tags.length > 0) {
          const currentTags = editNoteTags
            ? editNoteTags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [];
          const newTags = Array.from(new Set([...currentTags, ...tags]));
          setEditNoteTags(newTags.join(", "));
          uiShowToast("AI Tags generated successfully!", "success");
        }
      }
    } catch (e: any) {
      uiShowToast("AI Generation failed: " + e.message, "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Lazy-load content for the read/view mode when note is rendered
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

  // Sync upstream on edit mode start — also update viewContent so read mode stays fresh after save
  useEffect(() => {
    setLocalContent(editNoteContent);
    // If we're editing this note and content arrives, update our view cache too
    if (editingNoteId === note.id && editNoteContent) {
      setViewContent(editNoteContent);
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
  }, 1500);

  // Flush any pending save when NoteEditor unmounts (e.g. switching notes) or app quits
  useEffect(() => {
    const handleBeforeUnload = () => debouncedSave.flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      debouncedSave.flush();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [debouncedSave]);

  // 1.1 Auto-save on blur / debounce
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

  // 1.2 Markdown Toolbar action (preserves native Undo/Redo)
  const insertText = (before: string, after: string = "") => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);

    view.dispatch({
      changes: { from, to, insert: before + selectedText + after },
      selection: {
        anchor: from + before.length,
        head: from + before.length + selectedText.length,
      },
    });
    view.focus();
  };

  // 1.3 Paste image from clipboard
  const handlePaste = async (e: any) => {
    const clipboardData =
      e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
    const items = clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file && vaultPath) {
          try {
            const buffer = await file.arrayBuffer();
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const res = await ipcClient.fs.saveAsset(
              vaultPath,
              `${Math.random().toString(36).substring(7)}_${sanitizedName}`,
              buffer,
              note.project_id || (note as any).chapterId,
            );
            if (res.success && res.url) {
              const markdownAsset = `\n![${file.name}](${encodeURI(res.url)})\n`;
              insertText(markdownAsset);
              uiShowToast("Image uploaded", "success");
            }
          } catch (err: any) {
            uiShowToast("Failed to upload image: " + err.message, "error");
          }
        }
      }
    }
  };

  const handleEditorDrop = async (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (
      !file ||
      !(file.type.startsWith("image/") || file.type === "application/pdf")
    )
      return;

    if (vaultPath) {
      try {
        const buffer = await file.arrayBuffer();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const res = await ipcClient.fs.saveAsset(
          vaultPath,
          `${Math.random().toString(36).substring(7)}_${sanitizedName}`,
          buffer,
          note.project_id || (note as any).chapterId,
        );

        if (res.success && res.url) {
          const isPdf = file.type === "application/pdf";
          const markdownAsset = `\n${isPdf ? "" : "!"}[${file.name}](${encodeURI(res.url)})\n`;
          insertText(markdownAsset);
          uiShowToast("File uploaded", "success");
        }
      } catch (err: any) {
        uiShowToast("Failed to save asset: " + err.message, "error");
      }
    }
  };

  // 1.4 Note linking autocomplete & Undo tracking
  const handleContentChange = (val: string, viewUpdate?: any) => {
    setLocalContent(val);
    debouncedSetEditNoteContent(val);

    if (viewUpdate && viewUpdate.view) {
      const view = viewUpdate.view;
      const { head } = view.state.selection.main;
      const textBeforeCursor = view.state.sliceDoc(0, head);

      const lastOpen = textBeforeCursor.lastIndexOf("[[");
      const lastClose = textBeforeCursor.lastIndexOf("]]");

      if (lastOpen > lastClose && head - lastOpen < 30) {
        setShowLinkSuggestions(true);
        setLinkSearch(textBeforeCursor.substring(lastOpen + 2));
      } else {
        setShowLinkSuggestions(false);
      }
    }
  };

  const insertLink = (title: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { head } = view.state.selection.main;
    const textBeforeCursor = view.state.sliceDoc(0, head);
    const lastOpen = textBeforeCursor.lastIndexOf("[[");

    if (lastOpen !== -1) {
      const insertStr = "[[" + title + "]]";
      view.dispatch({
        changes: { from: lastOpen, to: head, insert: insertStr },
        selection: { anchor: lastOpen + insertStr.length },
      });
      view.focus();
    }

    setShowLinkSuggestions(false);
  };

  const getFormattedDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const linkSuggestions = allNotesFlat
    .filter(
      (n: any) =>
        n.title.toLowerCase().includes(linkSearch.toLowerCase()) &&
        n.id !== note.id,
    )
    .slice(0, 5);

  return (
    <div
      id={`note-${note.id}`}
      className="bg-card rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-2xl shadow-black/40 border border-border overflow-hidden scroll-m-32 relative mb-8 transition-shadow duration-300 hover:shadow-xl"
    >
      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-4 right-4 bg-gray-800 dark:bg-gray-700 text-white text-xs px-3 py-1.5 rounded shadow-lg z-50 flex items-center animate-fade-in-out">
          <CheckCircle2 size={12} className="mr-1.5 text-green-400" /> Saved
        </div>
      )}

      <div className="px-10 py-8 border-b border-border flex justify-between items-start group transition-colors">
        <div className="flex-1">
          <div className="flex items-center text-sm text-gray-400 dark:text-gray-500 font-medium mb-3">
            <Calendar size={12} className="mr-1.5" />
            <span className="uppercase tracking-wider">
              {getFormattedDate(note.date)}
            </span>
            <span className="mx-2">•</span>
            <span>{note.time}</span>
          </div>

          {editingNoteId === note.id ? (
            <input
              type="text"
              value={editNoteTitle}
              onChange={(e) => setEditNoteTitle(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-3xl md:text-4xl font-extrabold text-foreground tracking-tight placeholder-gray-300"
            />
          ) : (
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight flex items-center">
              {note.date === new Date().toISOString().split("T")[0] ? (
                <Circle
                  size={14}
                  className="fill-[#eab308] text-[#eab308] mr-2 flex-shrink-0"
                />
              ) : (
                <CheckCircle2
                  size={16}
                  className="text-green-500 mr-2 flex-shrink-0 opacity-70"
                />
              )}
              {note.title}
            </h2>
          )}
        </div>
        {editingNoteId !== note.id && (
          <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
            {vaultSettings.aiEnabled === "true" && (
              <Tooltip content={isGeneratingAI ? "Thinking..." : "AI Summary"}>
                <button
                  onClick={handleAIReadSummary}
                  disabled={isGeneratingAI}
                  className={`transition-colors ${isGeneratingAI ? "text-purple-300" : "text-purple-500 hover:text-purple-600"} disabled:opacity-50`}
                >
                  <Sparkles
                    size={16}
                    className={isGeneratingAI ? "animate-pulse" : ""}
                  />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Favourite">
              <button
                onClick={() => toggleFavourite(note.id)}
                className={`transition-colors ${note.favourite ? "text-[#eab308]" : "text-gray-400 hover:text-[#eab308]"}`}
              >
                <Star
                  size={16}
                  fill={note.favourite ? "currentColor" : "none"}
                />
              </button>
            </Tooltip>
            <Tooltip content="View History">
              <button
                onClick={() => handleOpenHistory(note)}
                className="text-gray-400 hover:text-purple-500 transition-colors"
              >
                <History size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Edit Note">
              <button
                onClick={() => startEditing(note)}
                className="text-gray-400 hover:text-blue-500 transition-colors"
              >
                <Edit2 size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Delete Note">
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="px-10 py-8 text-[15px] leading-relaxed text-foreground">
        {editingNoteId === note.id ? (
          <div className="space-y-4">
            {/* Markdown Toolbar */}
            <div className="flex gap-1 bg-background p-1.5 rounded-xl border border-border">
              <Tooltip content="Bold (Cmd+B)" side="top">
                <button
                  onClick={() => insertText("**", "**")}
                  className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333336] rounded transition-colors"
                >
                  <Bold size={14} />
                </button>
              </Tooltip>
              <Tooltip content="Italic (Cmd+I)" side="top">
                <button
                  onClick={() => insertText("*", "*")}
                  className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333336] rounded transition-colors"
                >
                  <Italic size={14} />
                </button>
              </Tooltip>
              <Tooltip content="Underline (Cmd+U)" side="top">
                <button
                  onClick={() => insertText("<u>", "</u>")}
                  className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333336] rounded transition-colors"
                >
                  <Underline size={14} />
                </button>
              </Tooltip>
              <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
              <Tooltip content="Bullet List" side="top">
                <button
                  onClick={() => insertText("- ")}
                  className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333336] rounded transition-colors"
                >
                  <List size={14} />
                </button>
              </Tooltip>
              <Tooltip content="Inline Code" side="top">
                <button
                  onClick={() => insertText("`", "`")}
                  className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333336] rounded transition-colors"
                >
                  <Code size={14} />
                </button>
              </Tooltip>
              <Tooltip content="Link" side="top">
                <button
                  onClick={() => insertText("[", "](url)")}
                  className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333336] rounded transition-colors"
                >
                  <Link size={14} />
                </button>
              </Tooltip>
              <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
              <Tooltip content="Insert Flashcard" side="top">
                <button
                  onClick={() =>
                    insertText(
                      "\n\n### Flashcard\n**Question:** \n\n**Answer:** \n\n[[flashcard]]\n",
                    )
                  }
                  className="p-1.5 text-[#007aff] hover:bg-blue-50 dark:hover:bg-[#007aff]/20 rounded transition-colors"
                >
                  <Layers size={14} />
                </button>
              </Tooltip>
              <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
              <Tooltip content="Split Preview (Cmd+P)" side="top">
                <button
                  onClick={() => setSplitPreview(!splitPreview)}
                  className={`p-1.5 rounded transition-colors ${splitPreview ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#333336]"}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
                    <line x1="12" y1="3" x2="12" y2="21"></line>
                  </svg>
                </button>
              </Tooltip>
            </div>

            <div
              className={`relative ${splitPreview ? "grid grid-cols-2 gap-4" : ""}`}
            >
              <MemoriserEditor
                editorRef={editorRef}
                value={localContent}
                onChange={handleContentChange}
                onPaste={handlePaste}
                onDrop={handleEditorDrop}
                onFocus={() => setFocusedNoteId(note.id)}
                onBlur={() => setFocusedNoteId(null)}
              />

              {/* Autocomplete Suggestions */}
              {showLinkSuggestions && (
                <div className="absolute top-1/2 left-4 w-64 bg-card border border-border rounded shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-1.5 bg-background text-xs font-semibold text-gray-500 border-b border-border">
                    Link to Note
                  </div>
                  {linkSuggestions.length > 0 ? (
                    linkSuggestions.map((s: any) => (
                      <button
                        key={s.id}
                        onClick={() => insertLink(s.title)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-[#333336] hover:text-blue-600 dark:hover:text-white transition-colors"
                      >
                        {s.title}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 italic">
                      No matches found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-[#fff8e6] dark:bg-[#2c2820] border border-[#fde047] dark:border-[#5a4a15]">
              <p className="text-xs font-bold text-[#ca8a04] dark:text-[#fde047] uppercase tracking-wide mb-2">
                Active Recall Flashcard (Optional)
              </p>
              <input
                type="text"
                placeholder="Question..."
                value={editFlashcardQ}
                onChange={(e) => setEditFlashcardQ(e.target.value)}
                className="w-full bg-white dark:bg-[#1a1a1c] border border-[#e4e4e7] dark:border-[#5a4a15] rounded p-2 mb-2 outline-none text-sm text-[#3f3f46] dark:text-gray-300"
              />
              <input
                type="text"
                placeholder="Answer..."
                value={editFlashcardA}
                onChange={(e) => setEditFlashcardA(e.target.value)}
                className="w-full bg-white dark:bg-[#1a1a1c] border border-[#e4e4e7] dark:border-[#5a4a15] rounded p-2 outline-none text-sm text-[#3f3f46] dark:text-gray-300"
              />
            </div>

            <div className="w-full bg-[#f4f4f5] dark:bg-[#1a1a1c] border border-border rounded p-2 flex flex-wrap gap-2 items-center min-h-[42px]">
              {editNoteTags
                .split(",")
                .map((t: string) => t.trim())
                .filter(Boolean)
                .map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="flex items-center px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800"
                  >
                    <Hash size={10} className="mr-1" />
                    {tag}
                    <button
                      onClick={() => {
                        const newTags = editNoteTags
                          .split(",")
                          .map((t: string) => t.trim())
                          .filter(Boolean);
                        newTags.splice(idx, 1);
                        setEditNoteTags(newTags.join(", "));
                      }}
                      className="ml-1.5 hover:text-red-500 focus:outline-none"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              <input
                type="text"
                placeholder={
                  editNoteTags ? "Add tag..." : "Tags (press enter)..."
                }
                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-[#3f3f46] dark:text-gray-300 placeholder-gray-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val) {
                      const currentTags = editNoteTags
                        .split(",")
                        .map((t: string) => t.trim())
                        .filter(Boolean);
                      if (!currentTags.includes(val)) {
                        setEditNoteTags([...currentTags, val].join(", "));
                      }
                      e.currentTarget.value = "";
                    }
                  } else if (
                    e.key === "Backspace" &&
                    e.currentTarget.value === ""
                  ) {
                    e.preventDefault();
                    const currentTags = editNoteTags
                      .split(",")
                      .map((t: string) => t.trim())
                      .filter(Boolean);
                    if (currentTags.length > 0) {
                      currentTags.pop();
                      setEditNoteTags(currentTags.join(", "));
                    }
                  }
                }}
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                {vaultSettings.aiEnabled === "true" && (
                  <div className="flex bg-[#f4f4f5] dark:bg-[#252528] rounded-lg p-1">
                    <button
                      onClick={() => handleAIGenerate("summary")}
                      disabled={isGeneratingAI || !localContent}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-[#333336] transition-colors disabled:opacity-50 flex items-center"
                    >
                      <Sparkles size={12} className="mr-1.5" />
                      {isGeneratingAI ? "Thinking..." : "AI Summary"}
                    </button>
                    <button
                      onClick={() => handleAIGenerate("tags")}
                      disabled={isGeneratingAI || !localContent}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-[#333336] transition-colors disabled:opacity-50 flex items-center"
                    >
                      <Hash size={12} className="mr-1.5" />
                      {isGeneratingAI ? "Thinking..." : "AI Tags"}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingNoteId(null)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-500 hover:bg-accent hover:text-accent-foreground"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    debouncedSave.cancel();
                    saveEdit(true, localContent);
                  }}
                  className="px-4 py-2 rounded-lg font-medium bg-[#007aff] text-white hover:bg-blue-600 flex items-center"
                >
                  <Save size={16} className="mr-2" /> Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <MarkdownRenderer content={isLoadingContent ? "" : viewContent} />
            {isLoadingContent && (
              <div className="flex flex-col gap-4 mt-2">
                <Skeleton height={20} count={3} />
                <Skeleton height={200} />
                <Skeleton height={20} count={4} />
              </div>
            )}

            {note.flashcard &&
              (note.flashcard.question || note.flashcard.answer) && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="bg-background border border-border rounded-xl p-6 relative">
                    <div className="absolute top-4 right-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Flashcard
                    </div>
                    <h4 className="text-sm font-bold text-[#1c1c1e] dark:text-gray-200 mb-3 pr-20">
                      {note.flashcard.question}
                    </h4>

                    {revealedCards.has(note.id) ? (
                      <div className="animate-fade-in">
                        <div className="p-4 bg-card rounded border border-border text-sm text-[#3f3f46] dark:text-gray-300">
                          {note.flashcard.answer}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleCard(note.id)}
                        className="text-sm font-medium text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-4 py-2 rounded-lg transition-colors"
                      >
                        Show Answer
                      </button>
                    )}
                  </div>
                </div>
              )}
          </>
        )}
      </div>

      {/* Backlinks */}
      <div className="px-8 py-6 border-t border-[#f4f4f5] dark:border-[#333336]">
        <h3 className="text-sm font-semibold text-[#1c1c1e] dark:text-white mb-3">
          Backlinks
        </h3>
        <div className="space-y-2">
          {(() => {
            const backlinks = allNotesFlat.filter(
              (n: any) =>
                n.id !== note.id &&
                (n.content || "").includes(`[[${note.title}]]`),
            );
            if (backlinks.length === 0)
              return (
                <div className="text-xs text-gray-500">
                  No notes link to this note.
                </div>
              );
            return backlinks.map((n: any) => (
              <div
                key={n.id}
                className="text-sm text-gray-600 dark:text-gray-400 bg-[#f4f4f5] dark:bg-card p-2 rounded"
              >
                Linked in:{" "}
                <span className="font-medium text-[#007aff]">{n.title}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      <Dialog
        open={!!aiSummaryPopup}
        onOpenChange={(open) => !open && setAiSummaryPopup(null)}
      >
        <DialogContent className="sm:max-w-[90vw] lg:max-w-[80vw] w-[95vw] bg-white dark:bg-[#1a1a1c] border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-foreground font-bold text-lg mb-2">
              <Sparkles className="w-5 h-5 mr-2 text-purple-500" /> AI Summary
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto pr-4">
            <MarkdownRenderer content={aiSummaryPopup || ""} />
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => handleDeleteNote(note.id)}
        title="Delete Note"
        description={
          <>
            Are you sure you want to delete <strong>{note.title}</strong>? It
            will be moved to the Trash.
          </>
        }
        confirmText="Delete Note"
      />
    </div>
  );
}
