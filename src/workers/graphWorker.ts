import * as Comlink from "comlink";
import type { Note } from "../domain/models";

export interface GraphData {
  nodes: any[];
  links: any[];
}

export class GraphWorker {
  buildGraphData(
    allNotesFlat: Note[],
    graphSelectedProjectIds: string[],
    isDark: boolean,
  ): GraphData {
    const selectedSet = new Set(graphSelectedProjectIds);
    const graphNotes =
      selectedSet.size > 0
        ? allNotesFlat.filter(
            (n: Note) => n.project_id && selectedSet.has(n.project_id),
          )
        : allNotesFlat;

    const tagSet = new Set<string>();
    graphNotes.forEach((n: Note) =>
      (n.tags || []).forEach((t: string) => tagSet.add(t)),
    );

    const tagLinks = graphNotes.flatMap((n: Note) =>
      (n.tags || []).map((t: string) => ({ source: n.id, target: "tag-" + t })),
    );
    const noteTitleMap = new Map();
    graphNotes.forEach((n: Note) => {
      if (n.title) {
        noteTitleMap.set(n.title.toLowerCase(), n);
      }
    });

    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const wikiLinks: { source: string; target: string; value: number }[] = [];
    graphNotes.forEach((n: Note) => {
      if (!n.content) return;
      const matches = [...n.content.matchAll(wikiLinkRegex)];
      matches.forEach((m) => {
        const targetTitle = m[1].split("|")[0].trim().toLowerCase();
        const targetNote = noteTitleMap.get(targetTitle);
        if (targetNote && targetNote.id !== n.id) {
          wikiLinks.push({ source: n.id, target: targetNote.id, value: 1 });
        }
      });
    });

    const allLinks = [...tagLinks, ...wikiLinks];

    const degrees: Record<string, number> = {};
    allLinks.forEach((link) => {
      degrees[link.source] = (degrees[link.source] || 0) + 1;
      degrees[link.target] = (degrees[link.target] || 0) + 1;
    });

    const tagNodes = Array.from(tagSet).map((tag) => ({
      id: "tag-" + tag,
      name: "#" + tag,
      type: "tag",
      val: Math.min(Math.max(2, (degrees["tag-" + tag] || 0) * 1.5), 10),
      color: isDark ? "#7c3aed" : "#a855f7",
    }));

    const noteNodes = graphNotes.map((n: Note) => ({
      id: n.id,
      name: n.title,
      type: "note",
      project_id: n.project_id,
      chapter_id: n.chapterId,
      val: Math.min(Math.max(4, (degrees[n.id] || 0) * 2), 15),
      color: isDark ? "#2563eb" : "#3b82f6",
    }));

    return {
      nodes: [...noteNodes, ...tagNodes],
      links: allLinks,
    };
  }
}

Comlink.expose(new GraphWorker());
