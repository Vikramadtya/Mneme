import { describe, expect, it } from 'vitest';
import type { VocabularyItem } from '../vocabulary/api';
import { checkTyped, clozeFor, definitionOf, exampleOf, formatInterval, meaningsFor } from './cardText';

const word = (extra: Partial<VocabularyItem>): VocabularyItem => ({ id: '1', word: 'candid', ...extra });

describe('checkTyped', () => {
  it('accepts exact answers ignoring case, accents and punctuation', () => {
    expect(checkTyped('  CANDID ', 'candid')).toBe('correct');
    expect(checkTyped('café', 'cafe')).toBe('correct');
  });
  it('treats one slip on a longer word as close', () => {
    expect(checkTyped('candidd', 'candid')).toBe('close');
  });
  it('does not forgive slips on short words or empty answers', () => {
    expect(checkTyped('cat', 'car')).toBe('wrong');
    expect(checkTyped('', 'candid')).toBe('wrong');
  });
  it('accepts any of several answers', () => {
    expect(checkTyped('ran', 'running', 'ran')).toBe('correct');
  });
});

describe('clozeFor', () => {
  it('blanks the word and its inflections in the example', () => {
    const c = clozeFor(word({ word: 'resilient', examples: ['Children are often more resilient than adults expect.'] }));
    expect(c).toEqual({ before: 'Children are often more ', answer: 'resilient', after: ' than adults expect.' });
    expect(clozeFor(word({ word: 'candid', examples: ['She spoke candidly.'] }))?.answer).toBe('candidly');
  });
  it('returns null without a usable example', () => {
    expect(clozeFor(word({}))).toBeNull();
    expect(clozeFor(word({ examples: ['Unrelated sentence.'] }))).toBeNull();
  });
});

describe('card content', () => {
  it('prefers what the user wrote over dictionary data', () => {
    const w = word({
      definitions: ['frank and honest'],
      examples: ['A candid reply.'],
      meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'an unposed photograph', example: 'A candid of the couple.' }] }],
    });
    expect(definitionOf(w)).toBe('frank and honest');
    expect(exampleOf(w)).toBe('A candid reply.');
    expect(meaningsFor(w)).toEqual([]);
  });
  it('uses dictionary meanings when the definition came from them', () => {
    const w = word({ definitions: ['frank'], meanings: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'frank' }] }] });
    expect(meaningsFor(w)).toHaveLength(1);
  });
});

describe('formatInterval', () => {
  it('formats days, months and years', () => {
    expect([0, 1, 14, 45, 400].map(formatInterval)).toEqual(['<1d', '1d', '14d', '2mo', '1.1y']);
  });
});
