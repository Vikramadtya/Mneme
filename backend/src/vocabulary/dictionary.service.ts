import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { VocabularyItem } from './schemas/vocabulary-item.schema.js';

@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);
  private readonly DATAMUSE_API_URL = 'https://api.datamuse.com/words';

  async fetchWordDetails(item: Partial<VocabularyItem>): Promise<Partial<VocabularyItem>> {
    if (!item.word) return item;
    
    try {
      const response = await axios.get(`${this.DATAMUSE_API_URL}?sp=${encodeURIComponent(item.word)}&md=dpfrs&max=1`);
      
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        
        if (result.defs && result.defs.length > 0) {
          item.definitions = result.defs.map((def: string) => {
            const parts = def.split('\t');
            return parts.length > 1 ? parts[1] : def;
          });
          
          item.meanings = [{
            partOfSpeech: result.defs[0].split('\t')[0] || 'unknown',
            definitions: [{
              definition: item.definitions![0],
              example: '',
              synonyms: [],
              antonyms: []
            }]
          }];
        }
        
        if (result.tags) {
          const pronunciationTag = result.tags.find((t: string) => t.startsWith('pron:'));
          if (pronunciationTag) {
            item.pronunciation = pronunciationTag.substring(5);
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error fetching word details from Datamuse: ${error.message}`);
    }
    
    return item;
  }
}
