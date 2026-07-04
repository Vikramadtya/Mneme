import React from "react";
import CodeMirror, { EditorView, dropCursor } from "@uiw/react-codemirror";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { useVault } from "../../application/context";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onPaste: (e: ClipboardEvent) => void;
  onDrop: (e: DragEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
}

export function MemoriserEditor({
  value,
  onChange,
  onPaste,
  onDrop,
  onFocus,
  onBlur,
  editorRef,
}: Props) {
  const vaultSettings = useVault((s) => s.vaultSettings);
  const theme =
    vaultSettings?.theme === "dark" ||
    (vaultSettings?.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? vscodeDark
      : "light";

  return (
    <div className="w-full bg-transparent min-h-[60vh] overflow-hidden px-10 py-6">
      <CodeMirror
        ref={editorRef as any}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          dropCursor(),
          EditorView.domEventHandlers({
            drop: (e, view) => {
              onDrop(e);
              return false;
            },
            paste: (e, view) => {
              onPaste(e);
              return false;
            },
          }),
        ]}
        theme={theme}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          autocompletion: false,
        }}
        style={{ height: "100%", minHeight: "58vh", outline: "none" }}
      />
    </div>
  );
}
