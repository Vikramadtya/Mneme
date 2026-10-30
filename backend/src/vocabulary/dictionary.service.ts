import { Injectable, Logger } from '@nestjs/common';
import { CreateWordDto } from './dto/word.dto.js';

export interface DictionaryEntry {
  partOfSpeech: string;
  definitions: string[];
  pronunciation?: string;
  audioUrl?: string;
  origin?: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  meanings: NonNullable<CreateWordDto['meanings']>;
}

const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const DATAMUSE_URL = 'https://api.datamuse.com/words';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 1000;
const LIST_MAX = 20;

const unique = (items: (string | undefined)[]) => [...new Set(items.filter((i): i is string => !!i?.trim()))].slice(0, LIST_MAX);

@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);
  private readonly cache = new Map<string, { at: number; entry: DictionaryEntry | null }>();

  /** Looks a word up (dictionaryapi.dev first, Datamuse as a fallback); null when unknown or both are down. */
  async lookup(word: string): Promise<DictionaryEntry | null> {
    const key = word.trim().toLowerCase();
    if (!key) return null;

    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.entry;

    const entry = (await this.fromDictionaryApi(key)) ?? (await this.fromDatamuse(key));
    // Only remember answers; a failure may be a temporary outage.
    if (entry) this.remember(key, entry);
    return entry;
  }

  private async fromDictionaryApi(key: string): Promise<DictionaryEntry | null> {
    try {
      const res = await fetch(`${DICTIONARY_API_URL}/${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null; // 404 means unknown word
      const entries = (await res.json()) as any[];
      if (!Array.isArray(entries) || !entries.length) return null;

      const meanings = entries
        .flatMap((e) => e.meanings ?? [])
        .map((m: any) => ({
          partOfSpeech: String(m.partOfSpeech || 'unknown').slice(0, 50),
          definitions: (m.definitions ?? []).slice(0, 5).map((d: any) => ({
            definition: String(d.definition ?? '').slice(0, 2000),
            example: d.example ? String(d.example).slice(0, 2000) : '',
            synonyms: unique(d.synonyms ?? []).slice(0, 10),
            antonyms: unique(d.antonyms ?? []).slice(0, 10),
          })),
          synonyms: unique(m.synonyms ?? []),
          antonyms: unique(m.antonyms ?? []),
        }))
        .filter((m: any) => m.definitions.length)
        .slice(0, 6);
      if (!meanings.length) return null;

      const phonetics = entries.flatMap((e) => e.phonetics ?? []);
      const audio = phonetics.find((p: any) => typeof p.audio === 'string' && p.audio.startsWith('https://'))?.audio;
      const flat = meanings.flatMap((m: any) => m.definitions);
      return {
        partOfSpeech: meanings[0].partOfSpeech,
        definitions: meanings.map((m: any) => m.definitions[0].definition),
        pronunciation: entries.find((e) => e.phonetic)?.phonetic ?? phonetics.find((p: any) => p.text)?.text,
        audioUrl: audio,
        origin: entries.find((e) => e.origin)?.origin?.slice(0, 1000),
        examples: unique(flat.map((d: any) => d.example)),
        synonyms: unique(meanings.flatMap((m: any) => [...m.synonyms, ...m.definitions.flatMap((d: any) => d.synonyms)])),
        antonyms: unique(meanings.flatMap((m: any) => [...m.antonyms, ...m.definitions.flatMap((d: any) => d.antonyms)])),
        meanings,
      };
    } catch (error: any) {
      this.logger.warn(`dictionaryapi.dev lookup failed: ${error.message}`);
      return null;
    }
  }

  private async fromDatamuse(key: string): Promise<DictionaryEntry | null> {
    try {
      const res = await fetch(`${DATAMUSE_URL}?sp=${encodeURIComponent(key)}&md=dpfrs&max=1`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Datamuse responded ${res.status}`);
      const [result] = (await res.json()) as any[];
      if (!result?.defs?.length) return null;

      const parsed = (result.defs as string[]).map((d) => d.split('\t'));
      const definitions = parsed.map((p) => (p.length > 1 ? p[1] : p[0]));
      const partOfSpeech = parsed[0][0] || 'unknown';
      return {
        partOfSpeech,
        definitions,
        pronunciation: (result.tags as string[] | undefined)?.find((t) => t.startsWith('pron:'))?.slice(5),
        examples: [],
        synonyms: [],
        antonyms: [],
        meanings: [{ partOfSpeech, definitions: [{ definition: definitions[0], example: '', synonyms: [], antonyms: [] }] }],
      };
    } catch (error: any) {
      this.logger.warn(`Datamuse lookup failed: ${error.message}`);
      return null;
    }
  }

  /** Fills in only what the user left empty; never overwrites user-provided data. */
  async enrich(item: CreateWordDto): Promise<CreateWordDto> {
    const entry = await this.lookup(item.word);
    if (!entry) return item;

    const enriched: CreateWordDto = { ...item };
    if (!enriched.definitions?.some((d) => d.trim())) enriched.definitions = entry.definitions;
    if (!enriched.meanings?.length) enriched.meanings = entry.meanings;
    if (!enriched.examples?.some((e) => e.trim()) && entry.examples.length) enriched.examples = entry.examples;
    if (!enriched.synonyms?.length && entry.synonyms.length) enriched.synonyms = entry.synonyms;
    if (!enriched.antonyms?.length && entry.antonyms.length) enriched.antonyms = entry.antonyms;
    if (!enriched.pronunciation && entry.pronunciation) enriched.pronunciation = entry.pronunciation;
    if (!enriched.audioUrl && entry.audioUrl) enriched.audioUrl = entry.audioUrl;
    if (!enriched.origin && entry.origin) enriched.origin = entry.origin;
    return enriched;
  }

  private remember(key: string, entry: DictionaryEntry | null) {
    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { at: Date.now(), entry });
  }
}
