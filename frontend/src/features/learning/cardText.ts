import type { VocabularyItem } from '../vocabulary/api';
import type { Rating } from './api';

/** What the user wrote wins over dictionary data that was added alongside it. */
export function definitionOf(word: VocabularyItem): string {
  return word.definitions?.[0] || word.meanings?.[0]?.definitions?.[0]?.definition || 'No definition available.';
}

/** Dictionary meanings to show on the answer side, or none when the user supplied their own definition. */
export function meaningsFor(word: VocabularyItem): NonNullable<VocabularyItem['meanings']> {
  const own = word.definitions?.[0];
  const firstMeaning = word.meanings?.[0]?.definitions?.[0]?.definition;
  if (!word.meanings?.length || (own && own !== firstMeaning)) return [];
  return word.meanings;
}

export function partOfSpeechOf(word: VocabularyItem): string | undefined {
  return meaningsFor(word)[0]?.partOfSpeech;
}

export function exampleOf(word: VocabularyItem): string | undefined {
  return word.examples?.find((e) => e.trim()) || word.meanings?.flatMap((m) => m.definitions).find((d) => d.example)?.example || undefined;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finds the word (or an inflection like "ubiquitously") inside an example sentence. */
export function clozeFor(word: VocabularyItem): { before: string; answer: string; after: string } | null {
  const example = exampleOf(word);
  if (!example) return null;
  const stem = word.word.trim();
  const match = new RegExp(`\\b${escapeRegExp(stem)}\\w*`, 'i').exec(example);
  if (!match) return null;
  return { before: example.slice(0, match.index), answer: match[0], after: example.slice(match.index + match[0].length) };
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

export type AnswerCheck = 'correct' | 'close' | 'wrong';

/** One slip on a longer word counts as close, not wrong. */
export function checkTyped(typed: string, ...accepted: string[]): AnswerCheck {
  const guess = normalize(typed);
  if (!guess) return 'wrong';
  const answers = accepted.map(normalize);
  if (answers.includes(guess)) return 'correct';
  return answers.some((a) => a.length >= 5 && distance(a, guess) === 1) ? 'close' : 'wrong';
}

export function formatInterval(days: number): string {
  if (days < 1) return '<1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1).replace(/\.0$/, '')}y`;
}

export const RATING_LABEL: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
