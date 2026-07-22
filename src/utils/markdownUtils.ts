const cache = new Map<string, string>();

export const preprocessMarkdown = (text: string | undefined): string => {
  if (!text) return "";

  if (text && cache.has(text as string)) {
    return cache.get(text as string)!;
  }

  if (!text) return "";

  // 1. Process Highlights ==text== -> <mark>text</mark>
  let processed = text.replace(
    /==([^=]+)==/g,
    (match, p1) =>
      "<mark>" + p1.replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</mark>",
  );

  // 2. Process MkDocs-style Admonitions: !!! type "optional title" or ??? type
  const lines = processed.split("\n");
  let inAdmonition = false;
  let isCollapsible = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inAdmonition) {
      // Matches !!! or ???, then type, then optional title (which may have quotes)
      const match = line.match(/^(!!!|\?\?\?)\s+([\w-]+)(?:\s+(.+))?\s*$/);
      if (match) {
        inAdmonition = true;
        isCollapsible = match[1] === "???";
        const type = match[2].toUpperCase();

        let rawTitle = match[3] || "";
        // Strip leading/trailing quotes (even multiple quotes like ""Title"")
        let title = rawTitle.replace(/^"+|"+$/g, "");
        if (!title) {
          title = type.charAt(0) + type.slice(1).toLowerCase();
        }

        let ghType = "NOTE";
        if (
          [
            "WARNING",
            "CAUTION",
            "DANGER",
            "BUG",
            "ERROR",
            "FAIL",
            "FAILURE",
          ].includes(type)
        )
          ghType = "WARNING";
        if (["IMPORTANT", "INFO"].includes(type)) ghType = "IMPORTANT";
        if (["TIP", "HINT", "SUCCESS", "CHECK"].includes(type)) ghType = "TIP";

        if (isCollapsible) {
          // Output HTML details for collapsible
          lines[i] =
            `<details class="markdown-alert markdown-alert-${ghType.toLowerCase()}"><summary class="markdown-alert-title"><svg viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm6.36-4.23a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1-1.06 1.06L9 5.81v5.44a.75.75 0 0 1-1.5 0V5.81L6.03 7.33a.75.75 0 0 1-1.06-1.06l2.5-2.5Z"></path></svg>${title}</summary>\n\n`;
        } else {
          // Output HTML div for normal admonition
          lines[i] =
            `<div class="markdown-alert markdown-alert-${ghType.toLowerCase()}"><p class="markdown-alert-title"><svg viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm6.36-4.23a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1-1.06 1.06L9 5.81v5.44a.75.75 0 0 1-1.5 0V5.81L6.03 7.33a.75.75 0 0 1-1.06-1.06l2.5-2.5Z"></path></svg>${title}</p>\n\n`;
        }
      }
    } else {
      if (/^ {2,4}/.test(line) || line.startsWith("\t")) {
        // Indented content
        lines[i] = line.replace(/^( {2,4}|\t)/, ""); // Remove indent for HTML block
      } else if (line.trim() === "") {
        // Empty line inside admonition
        lines[i] = `\n`;
      } else {
        // End of admonition
        inAdmonition = false;
        if (isCollapsible) {
          lines.splice(i, 0, "\n</details>\n");
        } else {
          lines.splice(i, 0, "\n</div>\n");
        }
        i++; // Skip the newly inserted closing tag
      }
    }
  }

  // Close any unclosed admonitions at the end of file
  if (inAdmonition) {
    if (isCollapsible) {
      lines.push("\n</details>\n");
    } else {
      lines.push("\n</div>\n");
    }
  }

  const result = lines.join("\n");

  // Keep cache size manageable (e.g., last 100 texts)
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey as string);
  }
  if (text) cache.set(text as string, result);

  return result;
};
