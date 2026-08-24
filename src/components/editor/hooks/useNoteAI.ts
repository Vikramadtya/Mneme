import { useState } from "react";
import { ipcClient } from "@/api/ipcClient";
import { useVault, useNotes, useUI } from "../../../application/context";

// Simple djb2 hash function for fast content hashing
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

export function useNoteAI(
  note: any,
  localContent: string,
  viewContent: string,
) {
  const vaultPath = useVault((s) => s.vaultPath);
  const vaultSettings = useVault((s) => s.vaultSettings);
  const allNotesFlat = useNotes((s: any) => s.allNotesFlat);

  const editNoteTitle = useUI((s) => s.editNoteTitle);
  const editNoteTags = useUI((s) => s.editNoteTags);
  const setEditNoteTags = useUI((s) => s.setEditNoteTags);
  const uiShowToast = useUI((s) => s.showToast);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummaryPopup, setAiSummaryPopup] = useState<string | null>(null);

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

      const { aiClient } = await import("../../../ai/client");
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
      const { aiClient } = await import("../../../ai/client");

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
        const existingTags: string[] = Array.from(
          new Set(
            allNotesFlat.flatMap((n: any) =>
              n.metadata?.tags
                ? n.metadata.tags
                    .split(",")
                    .map((t: string) => t.trim())
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
                .map((t: string) => t.trim())
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

  return {
    isGeneratingAI,
    aiSummaryPopup,
    setAiSummaryPopup,
    handleAIReadSummary,
    handleAIGenerate,
  };
}
