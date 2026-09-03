import { useState } from 'react';
import { useVocabularyItem, useUpdateVocabulary } from './api';
import { Volume2, Info, Map as MapIcon, Link as LinkIcon, Book, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

export function WordDetailView() {
  const { id } = useParams();
  const { data: word, isLoading } = useVocabularyItem(id as string);
  const updateWord = useUpdateVocabulary();
  
  const [noteText, setNoteText] = useState('');

  if (isLoading || !word) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const handlePlayAudio = () => {
    if (word.audioUrl) {
      new Audio(word.audioUrl).play();
    }
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
        const currentNotes = word.notes ? word.notes + "\n" + noteText : noteText;
        updateWord.mutate({ id: word.id, item: { ...word, notes: currentNotes } });
        setNoteText('');
    }
  };

  // Determine primary definition for the artistic left pane
  let primaryPos = 'word';
  let primaryDef = word.definitions?.[0] || '';
  let primaryExample = word.examples?.[0] || '';
  
  if (word.meanings && word.meanings.length > 0) {
      primaryPos = word.meanings[0].partOfSpeech;
      const firstDef = word.meanings[0].definitions[0];
      if (firstDef) {
          primaryDef = firstDef.definition;
          if (firstDef.example) primaryExample = firstDef.example;
      }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-serif">
      
      {/* Left Pane - Artistic Representation */}
      <div className="w-full md:w-1/2 relative bg-gradient-to-b from-[#8ab9ec] to-[#e4c995] flex flex-col justify-center items-center p-12 overflow-hidden">
        
        {/* Artistic Waves Background (Pure CSS approximation) */}
        <div className="absolute inset-0 opacity-40">
           <svg viewBox="0 0 1440 320" className="absolute top-1/3 w-full h-auto text-white fill-current"><path d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>
           <svg viewBox="0 0 1440 320" className="absolute top-1/2 w-full h-auto text-[#eedba6] fill-current opacity-80"><path d="M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,133.3C840,117,960,107,1080,117.3C1200,128,1320,160,1380,176L1440,192L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path></svg>
        </div>

        <Link to="/vocabulary" className="absolute top-6 left-6 text-white hover:text-slate-200 z-10 bg-black/10 p-2 rounded-full backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="relative z-10 text-center text-[#9b6f25] mt-32">
          <h1 className="text-7xl md:text-8xl lg:text-9xl mb-4 font-bold" style={{ fontFamily: "'Great Vibes', 'Brush Script MT', cursive" }}>
            {word.word}
          </h1>
          <p className="text-xl md:text-2xl mt-8">
            <strong className="font-sans font-bold">{primaryPos}</strong> {primaryDef}
          </p>
          
          {primaryExample && (
            <div className="mt-16 text-xl text-[#7a5518] relative">
              <span className="absolute -top-12 -left-8 text-8xl opacity-10 font-sans">"</span>
              <p>the <strong className="font-bold">{word.word}</strong> {primaryExample.replace(new RegExp(word.word, 'i'), '')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Dictionary Data */}
      <div className="w-full md:w-1/2 bg-white p-8 md:p-12 overflow-y-auto">
        <h2 className="text-4xl font-bold italic mb-6 text-slate-800">{word.word}</h2>
        
        {word.pronunciation && (
          <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button onClick={handlePlayAudio} disabled={!word.audioUrl} className={`p-2 rounded-full ${word.audioUrl ? 'hover:bg-slate-200 text-slate-700' : 'text-slate-400 opacity-50 cursor-not-allowed'}`}>
                <Volume2 className="w-6 h-6" />
              </button>
              <span className="text-lg font-sans font-medium">{word.pronunciation}</span>
            </div>
            <Info className="w-5 h-5 text-slate-400" />
          </div>
        )}

        {/* Meanings Card */}
        {word.meanings && word.meanings.length > 0 ? (
          <div className="border border-blue-100 rounded-xl overflow-hidden mb-6 shadow-sm">
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center text-blue-800 font-sans">
              <span className="font-bold text-sm">Meaning</span>
              <button className="flex items-center text-xs space-x-1 hover:underline"><Book className="w-3 h-3" /><span>Explain</span></button>
            </div>
            <div className="p-5 space-y-6 bg-white font-serif">
              {word.meanings.map((meaning, idx) => (
                <div key={idx}>
                  <h3 className="font-bold text-lg text-slate-800 mb-2">{meaning.partOfSpeech}</h3>
                  <ol className="list-decimal list-outside ml-4 space-y-3 text-slate-700">
                    {meaning.definitions.map((def, didx) => (
                      <li key={didx} className="pl-2">
                        <span>{def.definition}</span>
                        {def.example && <p className="text-slate-500 italic mt-1">{def.example}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-blue-100 rounded-xl overflow-hidden mb-6">
              <div className="p-5 space-y-4">
                  {word.definitions?.map((d, i) => <p key={i}>{d}</p>)}
              </div>
          </div>
        )}

        {/* Origin Card */}
        {word.origin && (
          <div className="border border-green-100 rounded-xl overflow-hidden mb-6 shadow-sm">
            <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex justify-between items-center text-green-800 font-sans">
              <span className="font-bold text-sm">Origin</span>
              <MapIcon className="w-4 h-4" />
            </div>
            <div className="p-5 bg-white text-slate-700">
              {word.origin}
            </div>
          </div>
        )}

        {/* Thesaurus Card */}
        {word.meanings && word.meanings.some(m => m.synonyms && m.synonyms.length > 0) && (
          <div className="border border-red-100 rounded-xl overflow-hidden mb-6 shadow-sm">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100 text-red-800 font-sans">
              <span className="font-bold text-sm">Thesaurus</span>
            </div>
            <div className="p-5 bg-white space-y-6">
              {word.meanings.filter(m => m.synonyms && m.synonyms.length > 0).map((meaning, idx) => (
                <div key={idx}>
                  <h3 className="font-bold text-slate-800 mb-2 capitalize">{meaning.partOfSpeech}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-sans">
                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider mr-2">Similar Words:</span>
                    {meaning.synonyms?.map((syn, sidx) => (
                      <span key={sidx} className="text-blue-600 hover:underline cursor-pointer">{syn}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {word.notes && (
             <div className="mb-4 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-slate-700 font-sans whitespace-pre-wrap">
                 <h4 className="font-bold text-xs uppercase tracking-wider text-yellow-800 mb-2">My Notes</h4>
                 {word.notes}
             </div>
        )}

        <div className="flex mt-4 items-center border border-red-100 bg-red-50/50 rounded-xl overflow-hidden focus-within:ring-2 ring-red-200 transition-all">
          <input 
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
            placeholder="Annotate with Notes..."
            className="flex-1 bg-transparent px-4 py-3 outline-none text-red-900 placeholder-red-400 font-sans text-sm"
          />
          <button onClick={handleSaveNote} className="px-4 text-red-500 hover:text-red-700 transition-colors flex items-center space-x-1 font-sans text-sm font-medium">
             <Book className="w-4 h-4" /> <span>Add Note</span>
          </button>
        </div>

      </div>
    </div>
  );
}
