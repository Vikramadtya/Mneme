import React, { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MarkdownHelpModalProps {
  onClose: () => void;
}

const markdownHelpContent = `
## Supported Markdown Features

Memoriser supports a wide range of standard and extended Markdown features. Here is a quick reference guide.

---

### Standard Formatting
**Bold**: \`**bold**\` &nbsp;&nbsp; | &nbsp;&nbsp; *Italic*: \`*italic*\` &nbsp;&nbsp; | &nbsp;&nbsp; ~~Strikethrough~~: \`~~strike~~\`

### Headings
\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3
\`\`\`

### Highlights
You can highlight text using double equals signs:
==This is highlighted== -> \`==This is highlighted==\`

### Admonitions (Callouts)
Use MkDocs-style admonitions for notes, warnings, and tips. Use \`!!!\` for fixed admonitions or \`???\` for collapsible ones. Indent the content by 2 to 4 spaces.

\`\`\`markdown
!!! note "Optional Title"
  This is a note block.
  
!!! warning
  This is a warning.
  
??? tip "Collapsible Tip"
  This tip can be expanded.
\`\`\`

!!! note "Example"
  This is how it renders!

### Spaced-Repetition Flashcards
You can embed flashcards directly in your notes. They will be automatically parsed and added to your review queue.
\`\`\`markdown
?Q: What is the powerhouse of the cell?
?A: Mitochondria
\`\`\`

### Math / LaTeX
Inline math: \`$E=mc^2$\`
Block math:
\`\`\`markdown
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$
\`\`\`

### Task Lists
\`\`\`markdown
- [x] Completed task
- [ ] Incomplete task
\`\`\`

### Code Blocks
\`\`\`\`markdown
\`\`\`javascript
console.log("Hello World");
\`\`\`
\`\`\`\`
`;

export function MarkdownHelpModal({ onClose }: MarkdownHelpModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownHelpContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-[#f5f5f7]/50 dark:bg-black/20">
          <h2 className="text-xl font-bold text-foreground">
            Markdown Cheat Sheet
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors"
            >
              {copied ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <Copy size={16} />
              )}
              {copied ? "Copied Raw Markdown!" : "Copy Raw Markdown"}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar bg-background">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-[#007aff]">
            <MarkdownRenderer content={markdownHelpContent} />
          </div>
        </div>
      </div>
    </div>
  );
}
