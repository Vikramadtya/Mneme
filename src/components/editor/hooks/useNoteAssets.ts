import type { RefObject } from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { ipcClient } from "@/api/ipcClient";
import { useVault, useUI } from "../../../application/context";

export function useNoteAssets(
  note: any,
  editorRef: RefObject<ReactCodeMirrorRef | null>,
) {
  const vaultPath = useVault((s) => s.vaultPath);
  const uiShowToast = useUI((s) => s.showToast);

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

  return {
    insertText,
    handlePaste,
    handleEditorDrop,
  };
}
