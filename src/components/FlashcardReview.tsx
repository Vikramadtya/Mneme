import { useState, useEffect } from "react";
import { NotebookPen, Play, Pause, RotateCcw } from "lucide-react";
import { useUI, useReview } from "../application/context";

export function FlashcardReview() {
  const toggleCard = useUI((s) => s.toggleCard);
  const dueReviewNotes = useReview((s) => s.dueReviewNotes);
  const reviewIndex = useReview((s) => s.reviewIndex);
  const revealedCards = useReview((s) => s.revealedCards);
  const updateNoteSRS = useReview((s) => s.updateNoteSRS);
  const formatInterval = useReview((s) => s.formatInterval);
  const calculateNextInterval = useReview((s) => s.calculateNextInterval);
  const setReviewMode = useReview((s) => s.setReviewMode);

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [customIntervalStr, setCustomIntervalStr] = useState("");

  useEffect(() => {
    let timer: any;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress =
    dueReviewNotes.length > 0
      ? (reviewIndex / dueReviewNotes.length) * 100
      : 100;

  return (
    <div className="absolute inset-0 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-xl z-30 flex flex-col items-center justify-center p-10 animate-in fade-in duration-300">
      {/* Progress Bar */}
      <div
        className="absolute top-0 left-0 h-1.5 bg-[#007aff] transition-all duration-300 shadow-[0_0_10px_rgba(0,122,255,0.5)]"
        style={{ width: `${progress}%` }}
      ></div>

      {/* Pomodoro Timer */}
      <div className="absolute top-6 right-8 flex items-center gap-3 bg-card px-4 py-2 rounded-full shadow-sm border border-border">
        <div className="text-xl font-mono font-bold text-[#1c1c1e] dark:text-white tracking-widest">
          {formatTime(timeLeft)}
        </div>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1"></div>
        <button
          onClick={() => setIsTimerRunning(!isTimerRunning)}
          className="text-gray-500 hover:text-[#007aff] transition-colors"
          title={isTimerRunning ? "Pause" : "Start Focus Timer"}
        >
          {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={() => {
            setIsTimerRunning(false);
            setTimeLeft(25 * 60);
          }}
          className="text-gray-500 hover:text-red-500 transition-colors"
          title="Reset Timer"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="text-center mb-12 mt-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6 shadow-sm">
          <NotebookPen size={40} />
        </div>
        <h2 className="text-4xl font-bold text-[#1c1c1e] dark:text-white tracking-tight">
          Spaced Repetition
        </h2>
        <p className="text-lg text-gray-500 mt-3 font-medium">
          Card {reviewIndex + 1} of {dueReviewNotes.length}
        </p>
      </div>

      {reviewIndex >= dueReviewNotes.length ? (
        <div className="text-center animate-in zoom-in-95 duration-500">
          <h3 className="text-2xl font-bold text-green-500 mb-4 flex items-center justify-center">
            You're all caught up! 🎉
          </h3>
          <p className="text-gray-500 mb-8">
            Come back tomorrow for more reviews.
          </p>
          <button
            onClick={() => setReviewMode(false)}
            className="bg-[#007aff] text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Finish Review
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl perspective-1000">
          <div
            className={`relative w-full transition-all duration-700 transform-style-preserve-3d ${revealedCards.has(dueReviewNotes[reviewIndex].id) ? "rotate-y-180" : ""}`}
            style={{ minHeight: "350px" }}
          >
            {/* Front of Card (Question) */}
            <div
              className="absolute inset-0 w-full h-full backface-hidden bg-card rounded-2xl shadow-xl border border-border p-10 flex flex-col justify-center items-center text-center cursor-pointer hover:shadow-2xl transition-shadow"
              onClick={() => toggleCard(dueReviewNotes[reviewIndex].id)}
            >
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border border-border px-3 py-1 rounded-full">
                Question
              </span>
              <p className="text-3xl font-medium text-[#1c1c1e] dark:text-gray-100 leading-relaxed">
                {dueReviewNotes[reviewIndex].flashcard.question}
              </p>
              <div className="absolute bottom-6 text-sm text-gray-400 flex items-center animate-pulse">
                Click to flip card
              </div>
            </div>

            {/* Back of Card (Answer) */}
            <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-card rounded-2xl shadow-xl border border-[#007aff]/30 dark:border-[#007aff]/30 p-10 flex flex-col justify-between">
              <div className="flex-1 flex flex-col justify-center items-center text-center overflow-y-auto">
                <span className="text-xs font-bold text-[#007aff] uppercase tracking-widest mb-6 border border-[#007aff]/20 px-3 py-1 rounded-full bg-[#007aff]/5">
                  Answer
                </span>
                <p className="text-2xl text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {dueReviewNotes[reviewIndex].flashcard.answer}
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <p className="text-center text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNoteSRS(dueReviewNotes[reviewIndex], 1);
                    }}
                    className="flex flex-col items-center bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-3 rounded-lg font-bold hover:bg-red-500/20 hover:scale-105 transition-all"
                  >
                    <span>Again</span>
                    <span className="text-[10px] opacity-70 mt-1 font-medium">
                      {formatInterval(
                        calculateNextInterval(dueReviewNotes[reviewIndex], 1),
                      )}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNoteSRS(dueReviewNotes[reviewIndex], 3);
                    }}
                    className="flex flex-col items-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-3 rounded-lg font-bold hover:bg-orange-500/20 hover:scale-105 transition-all"
                  >
                    <span>Hard</span>
                    <span className="text-[10px] opacity-70 mt-1 font-medium">
                      {formatInterval(
                        calculateNextInterval(dueReviewNotes[reviewIndex], 3),
                      )}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNoteSRS(dueReviewNotes[reviewIndex], 4);
                    }}
                    className="flex flex-col items-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-3 rounded-lg font-bold hover:bg-blue-500/20 hover:scale-105 transition-all"
                  >
                    <span>Good</span>
                    <span className="text-[10px] opacity-70 mt-1 font-medium">
                      {formatInterval(
                        calculateNextInterval(dueReviewNotes[reviewIndex], 4),
                      )}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateNoteSRS(dueReviewNotes[reviewIndex], 5);
                    }}
                    className="flex flex-col items-center bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-3 rounded-lg font-bold hover:bg-green-500/20 hover:scale-105 transition-all"
                  >
                    <span>Easy</span>
                    <span className="text-[10px] opacity-70 mt-1 font-medium">
                      {formatInterval(
                        calculateNextInterval(dueReviewNotes[reviewIndex], 5),
                      )}
                    </span>
                  </button>
                </div>

                <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-400">
                    Custom Interval (days):
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={customIntervalStr}
                    onChange={(e) => setCustomIntervalStr(e.target.value)}
                    className="w-16 bg-background border border-border rounded px-2 py-1 text-xs text-[#1c1c1e] dark:text-white outline-none focus:border-[#007aff]"
                    placeholder="e.g. 7"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const days = parseInt(customIntervalStr);
                      if (!isNaN(days) && days > 0) {
                        updateNoteSRS(dueReviewNotes[reviewIndex], 4, days);
                        setCustomIntervalStr("");
                      }
                    }}
                    disabled={!customIntervalStr}
                    className="bg-muted text-muted-foreground px-3 py-1 text-xs rounded hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setReviewMode(false)}
        className="mt-12 text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors font-medium border-b border-transparent hover:border-current pb-0.5"
      >
        Exit Review
      </button>
    </div>
  );
}
