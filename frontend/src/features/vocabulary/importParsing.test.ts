import { describe, expect, it } from 'vitest';
import { parseImport } from './importParsing';

describe('parseImport', () => {
  it('reads one word per line', () => {
    expect(parseImport('ubiquitous\nephemeral\n\n  serendipity  ').items.map((i) => i.word)).toEqual(['ubiquitous', 'ephemeral', 'serendipity']);
  });

  it('treats a single comma-separated line as a list of words, not columns', () => {
    const { items } = parseImport('apple, banana, cherry');
    expect(items.map((i) => i.word)).toEqual(['apple', 'banana', 'cherry']);
    expect(items[0].definitions).toBeUndefined();
  });

  it('reads CSV columns word, definition, example with quoted commas', () => {
    const { items } = parseImport('word,definition,example\n"candid","truthful, frank","She was candid."\nlaconic,using few words');
    expect(items).toEqual([
      { word: 'candid', definitions: ['truthful, frank'], examples: ['She was candid.'] },
      { word: 'laconic', definitions: ['using few words'] },
    ]);
  });

  it('keeps entries without a definition when most lines have one', () => {
    const { items } = parseImport('abstruse, hard to understand\nbenevolent, kind\nlaconic');
    expect(items).toEqual([{ word: 'abstruse', definitions: ['hard to understand'] }, { word: 'benevolent', definitions: ['kind'] }, { word: 'laconic' }]);
  });

  it('reads Anki tab-separated exports, skipping comments and stripping HTML', () => {
    const text = '#separator:tab\n#html:true\n<b>resilient</b>\table to recover<br>quickly\n';
    expect(parseImport(text).items).toEqual([{ word: 'resilient', definitions: ['able to recover quickly'] }]);
  });

  it('handles doubled quotes, BOMs and Windows line endings', () => {
    const { items } = parseImport('﻿"say ""hi""";greeting\r\nbye;farewell');
    expect(items).toEqual([{ word: 'say "hi"', definitions: ['greeting'] }, { word: 'bye', definitions: ['farewell'] }]);
  });

  it('ignores empty and over-long entries and reports them', () => {
    const { items, ignored } = parseImport(`ok,fine\n${'x'.repeat(101)},too long\n,definition only`);
    expect(items.map((i) => i.word)).toEqual(['ok']);
    expect(ignored).toBe(2);
  });
});
