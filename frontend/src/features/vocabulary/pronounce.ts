import type { VocabularyItem } from './api';

let current: HTMLAudioElement | null = null;

export const canPronounce = (word: Pick<VocabularyItem, 'audioUrl'>) => !!word.audioUrl || 'speechSynthesis' in window;

/** Plays the recorded pronunciation when there is one, otherwise the browser's own voice. */
export function pronounce(word: Pick<VocabularyItem, 'word' | 'audioUrl'>) {
  current?.pause();
  speechSynthesis?.cancel?.();

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  if (word.audioUrl && word.audioUrl.startsWith('https://')) {
    current = new Audio(word.audioUrl);
    current.play().catch(speak); // blocked or unreachable audio falls back to synthesis
  } else {
    speak();
  }
}
