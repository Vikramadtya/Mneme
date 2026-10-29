import { Injectable, Logger } from '@nestjs/common';
import { CreateWordDto } from './dto/word.dto.js';

export interface DictionaryEntry {
  partOfSpeech: string;
  definitions: string[];
  pronunciation?: string;
}

const DATAMUSE_URL = 'https://api.datamuse.com/words';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 1000;

@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);
  private readonly cache = new Map<string, { at: number; entry: DictionaryEntry | null }>();

  /** Looks a word up on Datamuse; returns null when unknown or the API is unavailable. */
  async lookup(word: string): Promise<DictionaryEntry | null> {
    const key = word.trim().toLowerCase();
    if (!key) return null;

    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.entry;

    try {
      const res = await fetch(`${DATAMUSE_URL}?sp=${encodeURIComponent(key)}&md=dpfrs&max=1`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Datamuse responded ${res.status}`);
      const [result] = (await res.json()) as any[];

      let entry: DictionaryEntry | null = null;
      if (result?.defs?.length) {
        const parsed = (result.defs as string[]).map((d) => d.split('\t'));
        entry = {
          partOfSpeech: parsed[0][0] || 'unknown',
          definitions: parsed.map((p) => (p.length > 1 ? p[1] : p[0])),
          pronunciation: (result.tags as string[] | undefined)?.find((t) => t.startsWith('pron:'))?.slice(5),
        };
      }
      this.remember(key, entry);
      return entry;
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
    if (!enriched.meanings?.length) {
      enriched.meanings = [
        {
          partOfSpeech: entry.partOfSpeech,
          definitions: [{ definition: entry.definitions[0], example: '', synonyms: [], antonyms: [] }],
        },
      ];
    }
    if (!enriched.pronunciation && entry.pronunciation) enriched.pronunciation = entry.pronunciation;
    return enriched;
  }

  private remember(key: string, entry: DictionaryEntry | null) {
    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { at: Date.now(), entry });
  }
}
