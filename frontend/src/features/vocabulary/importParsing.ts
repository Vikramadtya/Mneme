import type { VocabularyItem } from './api';

export type ImportItem = Pick<VocabularyItem, 'word' | 'definitions' | 'examples'>;

const MAX_WORD = 100;
const HEADER_NAMES = new Set(['word', 'front', 'term', 'vocabulary', 'vocab']);

/** Anki exports fields as HTML; keep the text. */
const stripHtml = (text: string) =>
  text.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

/** Splits one line into fields, honouring "quoted, fields" and doubled quotes. */
function splitLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === delimiter) { fields.push(field); field = ''; }
    else field += ch;
  }
  fields.push(field);
  return fields.map((f) => f.trim());
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 20);
  const withSome = (d: string) => sample.filter((l) => l.includes(d)).length;
  // Tabs (Anki) and semicolons are unambiguous columns. Commas are columns when several lines are present and at
  // least half contain one (some entries may lack a definition); "apple, banana, cherry" on a single line is a list.
  if (withSome('\t') > 0) return '\t';
  if (sample.length > 1 && withSome(';') >= sample.length / 2) return ';';
  if (sample.length > 1 && withSome(',') >= sample.length / 2) return ',';
  return '\n';
}

/**
 * Turns pasted text or a CSV / TSV / Anki export into words.
 * Columns are word, definition, example. A plain list (one word per line, or comma separated) works too.
 */
export function parseImport(raw: string): { items: ImportItem[]; ignored: number } {
  const text = raw.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (!lines.length) return { items: [], ignored: 0 };

  const delimiter = detectDelimiter(lines);
  let rows: string[][];
  if (delimiter === '\n') {
    rows = lines.flatMap((l) => l.split(/[,;]/)).map((w) => [w.trim()]);
  } else {
    rows = lines.map((l) => splitLine(l, delimiter));
  }

  if (rows.length > 1 && HEADER_NAMES.has(stripHtml(rows[0][0] ?? '').toLowerCase())) rows = rows.slice(1);

  const items: ImportItem[] = [];
  let ignored = 0;
  for (const row of rows) {
    const word = stripHtml(row[0] ?? '');
    if (!word || word.length > MAX_WORD) { ignored += 1; continue; }
    const definition = stripHtml(row[1] ?? '');
    const example = stripHtml(row[2] ?? '');
    items.push({ word, ...(definition && { definitions: [definition] }), ...(example && { examples: [example] }) });
  }
  return { items, ignored };
}
