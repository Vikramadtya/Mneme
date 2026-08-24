import React, { useDeferredValue, useMemo } from "react";
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
  renderer: {
    heading(token: any) {
      const text = token.text;
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens || [])}</h${token.depth}>`;
    },
  },
});

export function MarkdownRenderer({ content }: { content: string }) {
  const vaultPath = useVault((s) => s.vaultPath);
  const setActivePdf = useNotes((s) => s.setActivePdf);
  const vaultSettings = useVault((s) => s.vaultSettings);

  const deferredContent = useDeferredValue(content);

  const reactContent = useMemo(() => {
    let processed = preprocessMarkdown(deferredContent);

    // Preprocess [[wikilinks]]
    processed = processed.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
      return `<a href="#" class="wikilink" data-target="${p1.replace(/"/g, "&quot;")}">[[${p1}]]</a>`;
    });

    const rawHtml = marked.parse(processed) as string;

    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ["data-target", "target", "class", "style"],
      USE_PROFILES: { mathMl: true, svg: true, html: true },
    });

    return parse(cleanHtml, {
      replace: (domNode) => {
        if (domNode instanceof Element && domNode.attribs) {
          if (domNode.name === "img") {
            let src = domNode.attribs.src;
            if (src && !src.startsWith("http") && vaultPath) {
              // First decode to remove any existing %20, so we can reliably re-encode the whole absolute path
              const decodedSrc = decodeURIComponent(src);
              const assetMatch = decodedSrc.match(/assets\/(.+)$/);

              let rawLocalPath = "";
              if (assetMatch) {
                rawLocalPath = `${vaultPath}/assets/${assetMatch[1]}`;
              } else {
                const filename = decodedSrc.split("/").pop();
                rawLocalPath = `${vaultPath}/assets/images/${filename}`;
              }

              // Encode the absolute path using encodeURI which correctly handles spaces but leaves path delimiters and commas alone
              const encodedLocalPath = encodeURI(
                rawLocalPath.replace(/\\/g, "/"),
              );

              src = `file://${encodedLocalPath}`;
            }
            return (
              <div className="flex justify-center w-full my-6">
                <Zoom>
                  <img
                    src={src}
                    alt={domNode.attribs.alt || ""}
                    className={`max-w-full h-auto rounded-lg shadow-sm border border-border/40 ${domNode.attribs.class || ""}`}
                  />
                </Zoom>
              </div>
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
                      const decodedHref = decodeURIComponent(href);
                      const assetMatch = decodedHref.match(/assets\/(.+)$/);

                      let rawLocalPath = "";
                      if (assetMatch) {
                        rawLocalPath = `${vaultPath}/assets/${assetMatch[1]}`;
                      } else {
                        const filename = decodedHref.split("/").pop();
                        rawLocalPath = `${vaultPath}/assets/images/${filename}`;
                      }

                      const encodedLocalPath = encodeURI(
                        rawLocalPath.replace(/\\/g, "/"),
                      );

                      setActivePdf(`file://${encodedLocalPath}`);
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
  }, [deferredContent, vaultPath, setActivePdf]);

  return (
    <div
      className={`prose ${vaultSettings?.theme !== "light" ? "dark:prose-invert" : ""} max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-h3:text-lg prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-2 prose-pre:bg-[#1e1e1e] prose-pre:border prose-pre:border-[#333336] ${content !== deferredContent ? "opacity-70 transition-opacity duration-200" : "opacity-100"}`}
    >
      {reactContent}
    </div>
  );
}
