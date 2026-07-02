import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import parse, { domToReact, Element } from "html-react-parser";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import "highlight.js/styles/vs2015.css";
import "katex/dist/katex.min.css";
import { preprocessMarkdown } from "../utils/markdownUtils";
import { useVault, useNotes } from "../application/context";

import { markedHighlight } from "marked-highlight";
import markedKatex from "marked-katex-extension";

// Configure marked with highlight.js
marked.use(
  markedKatex({
    throwOnError: false,
  }),
);
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);
marked.use({
  gfm: true,
  breaks: true,
});

export function MarkdownRenderer({ content }: { content: string }) {
  const vaultPath = useVault((s) => s.vaultPath);
  const setActivePdf = useNotes((s) => s.setActivePdf);
  const vaultSettings = useVault((s) => s.vaultSettings);

  let processed = preprocessMarkdown(content);

  // Preprocess [[wikilinks]]
  processed = processed.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
    return `<a href="#" class="wikilink" data-target="${p1.replace(/"/g, "&quot;")}">[[${p1}]]</a>`;
  });

  const rawHtml = marked.parse(processed) as string;

  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["data-target", "target", "class", "style"],
    USE_PROFILES: { mathMl: true, svg: true, html: true },
  });

  const reactContent = parse(cleanHtml, {
    replace: (domNode) => {
      if (domNode instanceof Element && domNode.attribs) {
        if (domNode.name === "img") {
          let src = domNode.attribs.src;
          if (src && !src.startsWith("http") && vaultPath) {
            const assetMatch = src.match(/assets\/(.+)$/);
            if (assetMatch) {
              src = `file://${vaultPath}/docs/assets/${assetMatch[1]}`;
            } else {
              const filename = src.split("/").pop();
              src = `file://${vaultPath}/docs/assets/images/${filename}`;
            }
          }
          return (
            <Zoom>
              <img
                src={src}
                alt={domNode.attribs.alt || ""}
                className={domNode.attribs.class || ""}
              />
            </Zoom>
          );
        }

        if (domNode.name === "a") {
          const href = domNode.attribs.href;
          const isPdf = href && href.endsWith(".pdf");
          const isWikilink = domNode.attribs.class === "wikilink";

          if (isPdf) {
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (vaultPath && !href.startsWith("http")) {
                    const assetMatch = href.match(/assets\/(.+)$/);
                    if (assetMatch) {
                      setActivePdf(
                        `file://${vaultPath}/docs/assets/${assetMatch[1]}`,
                      );
                    } else {
                      const filename = href.split("/").pop();
                      setActivePdf(
                        `file://${vaultPath}/docs/assets/images/${filename}`,
                      );
                    }
                  } else {
                    setActivePdf(href);
                  }
                }}
                className="text-blue-500 hover:underline flex items-center inline-flex"
              >
                📄 {domToReact(domNode.children as any)}
              </button>
            );
          }

          if (isWikilink) {
            return (
              <a href="#" className="text-blue-500 hover:underline">
                {domToReact(domNode.children as any)}
              </a>
            );
          }
        }
      }
    },
  });

  return (
    <div
      className={`prose ${vaultSettings?.theme !== "light" ? "dark:prose-invert" : ""} max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-h3:text-lg prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-2 prose-pre:bg-[#1e1e1e] prose-pre:border prose-pre:border-[#333336]`}
    >
      {reactContent}
    </div>
  );
}
