import { useState, useEffect } from 'react';
import { TodayReview } from './api';
import { useTodaysReviews, useSubmitReview } from './api';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, Brain } from 'lucide-react';

export function FlashcardSession() {
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get('collectionId');
  
  const { data: initialReviews, isLoading, isError } = useTodaysReviews(collectionId);
  const submitReview = useSubmitReview();
  
  const [reviews, setReviews] = useState<TodayReview[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    if (initialReviews && reviews === null) {
        setReviews(initialReviews);
    }
  }, [initialReviews, reviews]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (isError) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500">Failed to load session.</div>;

  if (!reviews || reviews.length === 0 || currentIndex >= reviews.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center max-w-md w-full">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Session Complete!</h2>
            <p className="text-slate-500 mb-8">You're all caught up for {collectionId ? 'this collection' : 'today'}. Great job building your vocabulary!</p>
            <Link to="/" className="inline-flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
            </Link>
        </div>
      </div>
    );
  }

  const currentItem = reviews[currentIndex];
  const { vocabulary } = currentItem;

  const handleGrade = (grade: number) => {
    submitReview.mutate({ wordId: vocabulary.id, grade });
    setIsRevealed(false);
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="p-6 flex justify-between items-center max-w-4xl mx-auto w-full">
          <Link to="/" className="text-slate-400 hover:text-slate-700 flex items-center space-x-2 transition">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Exit</span>
          </Link>
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-full border border-slate-200">
              <Brain className="w-4 h-4 text-blue-500" />
              <span>{currentIndex + 1} / {reviews.length}</span>
          </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl">
              
              {/* Flashcard Container */}
              <div className="relative w-full min-h-[400px]">
                  
                  {/* Front */}
                  {!isRevealed && (
                    <div className="w-full bg-white rounded-3xl p-12 md:p-16 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center text-center min-h-[400px] absolute inset-0 animate-in fade-in zoom-in-95 duration-300">
                        <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-8">What does this mean?</span>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">{vocabulary.word}</h1>
                    </div>
                  )}

                  {/* Back (Revealed) */}
                  {isRevealed && (
                    <div className="w-full bg-white rounded-3xl p-12 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-center min-h-[400px] absolute inset-0 animate-in fade-in zoom-in-105 duration-300">
                        <h2 className="text-3xl font-bold text-slate-900 mb-6">{vocabulary.word}</h2>
                        
                        {vocabulary.meanings && vocabulary.meanings.length > 0 ? (
                            <div className="space-y-4 overflow-y-auto max-h-[250px] pr-2">
                                {vocabulary.meanings.map((m: any, i: number) => (
                                    <div key={i}>
                                        <span className="text-sm font-bold text-blue-600 mb-1 block">{m.partOfSpeech}</span>
                                        <p className="text-lg text-slate-700">{m.definitions[0]?.definition}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xl text-slate-700 mb-4">{vocabulary.definitions?.[0]}</p>
                        )}

                        {vocabulary.examples && vocabulary.examples.length > 0 && (
                            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-slate-600 italic">"{vocabulary.examples[0]}"</p>
                            </div>
                        )}
                    </div>
                  )}

              </div>

              {/* Controls */}
              <div className="mt-12 flex justify-center min-h-[80px]">
                  {!isRevealed ? (
                      <button 
                          onClick={() => setIsRevealed(true)}
                          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center space-x-2 w-full sm:w-auto justify-center"
                      >
                          <span>Show Answer</span>
                      </button>
                  ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full animate-in slide-in-from-bottom-4 fade-in duration-300">
                          <button onClick={() => handleGrade(1)} className="group bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-2xl p-4 transition-all shadow-sm">
                              <span className="block font-bold text-slate-700 group-hover:text-red-700">Again</span>
                              <span className="text-xs text-slate-400 group-hover:text-red-400">&lt; 10m</span>
                          </button>
                          <button onClick={() => handleGrade(2)} className="group bg-white border border-slate-200 hover:border-orange-200 hover:bg-orange-50 rounded-2xl p-4 transition-all shadow-sm">
                              <span className="block font-bold text-slate-700 group-hover:text-orange-700">Hard</span>
                              <span className="text-xs text-slate-400 group-hover:text-orange-400">1 day</span>
                          </button>
                          <button onClick={() => handleGrade(3)} className="group bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 rounded-2xl p-4 transition-all shadow-sm">
                              <span className="block font-bold text-slate-700 group-hover:text-blue-700">Good</span>
                              <span className="text-xs text-slate-400 group-hover:text-blue-400">3 days</span>
                          </button>
                          <button onClick={() => handleGrade(4)} className="group bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 rounded-2xl p-4 transition-all shadow-sm">
                              <span className="block font-bold text-slate-700 group-hover:text-emerald-700">Easy</span>
                              <span className="text-xs text-slate-400 group-hover:text-emerald-400">5 days</span>
                          </button>
                      </div>
                  )}
              </div>
          </div>
      </main>
    </div>
  );
}
