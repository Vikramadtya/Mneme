import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, Flame, Keyboard, RotateCcw, Sparkles, Undo2, Volume2, VolumeX, WifiOff, X } from 'lucide-react'
import { fetchApi } from '../../api/client'
import { refreshAfterReview, useTodaysReviews, type Rating, type ReviewMode, type TodayReview } from './api'
import { checkTyped, clozeFor, definitionOf, exampleOf, formatInterval, meaningsFor, partOfSpeechOf, RATING_LABEL, type AnswerCheck } from './cardText'
import { dropQueued, queuedCount, sendReview, startQueueSync } from './reviewQueue'
import { pronounce } from '../vocabulary/pronounce'
import { Badge, Button, buttonClass, Card, cx, ProgressBar, Segmented, Skeleton } from '../../ui'
import { useLocalStorage } from '../../ui/hooks'

const MODES: { value: ReviewMode; label: string }[] = [
  { value: 'flip', label: 'Flip' },
  { value: 'reverse', label: 'Reverse' },
  { value: 'typed', label: 'Type' },
  { value: 'cloze', label: 'Fill blank' },
]
const MAX_REPEATS = 2 // how many times a forgotten card comes back within one session
const SWIPE_DISTANCE = 110

interface HistoryEntry {
  index: number
  wordId: string
  word: string
  rating: Rating
  /** True if the review is still waiting in the offline queue. */
  repeated: boolean
}

const ratingStyle: Record<Rating, string> = {
  1: 'hover:border-danger/50 hover:bg-danger-soft hover:text-danger data-[suggested=true]:border-danger/60 data-[suggested=true]:bg-danger-soft',
  2: 'hover:border-warning/50 hover:bg-warning-soft hover:text-warning data-[suggested=true]:border-warning/60 data-[suggested=true]:bg-warning-soft',
  3: 'hover:border-accent/50 hover:bg-accent-soft hover:text-accent data-[suggested=true]:border-accent/60 data-[suggested=true]:bg-accent-soft',
  4: 'hover:border-success/50 hover:bg-success-soft hover:text-success data-[suggested=true]:border-success/60 data-[suggested=true]:bg-success-soft',
}

export function FlashcardSession() {
  const [searchParams] = useSearchParams()
  const collectionId = searchParams.get('collectionId')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: initial, isLoading, isError, refetch } = useTodaysReviews(collectionId)

  const [mode, setMode] = useLocalStorage<ReviewMode>('memoriser.reviewMode', 'flip')
  const [autoPlay, setAutoPlay] = useLocalStorage('memoriser.autoPlay', false)

  const [queue, setQueue] = useState<TodayReview[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [typed, setTyped] = useState('')
  const [check, setCheck] = useState<AnswerCheck | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [repeats, setRepeats] = useState<Record<string, number>>({})
  const [offlineNotified, setOfflineNotified] = useState(false)
  const [pending, setPending] = useState(queuedCount())
  const [startedAt, setStartedAt] = useState(Date.now)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initial && queue === null) setQueue(initial)
  }, [initial, queue])

  useEffect(() => {
    const sync = () => setPending(queuedCount())
    window.addEventListener('memoriser:queue', sync)
    const stop = startQueueSync(() => refreshAfterReview(queryClient))
    return () => {
      window.removeEventListener('memoriser:queue', sync)
      stop()
    }
  }, [queryClient])

  const card = queue?.[index]
  const word = card?.vocabulary
  const cloze = useMemo(() => (word ? clozeFor(word) : null), [word])
  // Fill-in-the-blank needs an example that contains the word; otherwise fall back to typing it from the definition.
  const effectiveMode: ReviewMode = mode === 'cloze' && !cloze ? 'typed' : mode
  const needsTyping = effectiveMode === 'typed' || effectiveMode === 'cloze'

  const resetCard = useCallback(() => {
    setRevealed(false)
    setTyped('')
    setCheck(null)
  }, [])

  useEffect(() => {
    resetCard()
    if (needsTyping) setTimeout(() => inputRef.current?.focus(), 80)
  }, [index, mode, resetCard, needsTyping])

  const reveal = useCallback(() => {
    setRevealed(true)
    if (autoPlay && word) pronounce(word)
  }, [autoPlay, word])

  const submitTyped = () => {
    if (!word || revealed) return
    const answers = effectiveMode === 'cloze' && cloze ? [cloze.answer, word.word] : [word.word]
    setCheck(checkTyped(typed, ...answers))
    reveal()
  }

  const giveUp = () => {
    setCheck('wrong')
    reveal()
  }

  const grade = useCallback(
    async (rating: Rating) => {
      if (!card || !queue || !revealed) return
      const wordId = card.vocabulary.id
      const seen = repeats[wordId] ?? 0
      const comesBack = rating === 1 && seen < MAX_REPEATS
      setHistory((h) => [...h, { index, wordId, word: card.vocabulary.word, rating, repeated: comesBack }])
      if (comesBack) {
        setRepeats((r) => ({ ...r, [wordId]: seen + 1 }))
        setQueue((q) => (q ? [...q, card] : q))
      }
      setIndex((i) => i + 1)

      try {
        const sent = await sendReview({ wordId, grade: rating, mode: effectiveMode })
        if (!sent && !offlineNotified) {
          setOfflineNotified(true)
          toast('Saved on this device. It will sync when you are back online.', { icon: '📴' })
        }
        if (sent) refreshAfterReview(queryClient)
      } catch {
        toast.error('Could not save that review.')
      }
    },
    [card, queue, revealed, repeats, index, effectiveMode, offlineNotified, queryClient],
  )

  const undo = useCallback(async () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory((h) => h.slice(0, -1))
    if (last.repeated) {
      setQueue((q) => (q ? q.slice(0, -1) : q))
      setRepeats((r) => ({ ...r, [last.wordId]: Math.max(0, (r[last.wordId] ?? 1) - 1) }))
    }
    setIndex(last.index)
    try {
      if (!dropQueued(last.wordId)) {
        await fetchApi(`/learning/${last.wordId}/undo`, { method: 'POST' })
        refreshAfterReview(queryClient)
      }
    } catch {
      toast.error('Could not undo that review.')
    }
  }, [history, queryClient])

  // Keyboard: Space reveals, 1-4 grade, Z undoes, P plays the word
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if (typing) return
      if ((e.key === ' ' || e.key === 'Enter') && !revealed && !needsTyping) {
        e.preventDefault()
        reveal()
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        void grade(Number(e.key) as Rating)
      } else if (e.key.toLowerCase() === 'z' || e.key === 'Backspace') {
        void undo()
      } else if (e.key.toLowerCase() === 'p' && word) {
        pronounce(word)
      } else if (e.key === 'Escape') {
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, needsTyping, reveal, grade, undo, word, navigate])

  /* ---- Swipe (touch) ---- */
  const [drag, setDrag] = useState({ x: 0, active: false })
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    if (!revealed || e.pointerType === 'mouse') return
    dragStart.current = { x: e.clientX, y: e.clientY }
    moved.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const start = dragStart.current
    if (!start) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      moved.current = true
      setDrag({ x: dx, active: true })
    }
  }
  const onPointerEnd = () => {
    const x = drag.x
    dragStart.current = null
    setDrag({ x: 0, active: false })
    if (Math.abs(x) >= SWIPE_DISTANCE) void grade(x > 0 ? 3 : 1)
  }

  /* ---- Screens ---- */
  if (isLoading || (initial && queue === null)) {
    return (
      <Shell>
        <Skeleton className="mx-auto h-72 w-full max-w-xl" />
      </Shell>
    )
  }
  if (isError) {
    return (
      <Shell>
        <Card className="mx-auto max-w-md p-8 text-center">
          <WifiOff className="mx-auto mb-3 h-8 w-8 text-muted" />
          <h2 className="text-lg font-bold">Could not load your session</h2>
          <p className="mt-1 text-sm text-muted">Check your connection and try again.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => refetch()}>Try again</Button>
            <Link to="/" className={buttonClass('secondary')}>Back</Link>
          </div>
        </Card>
      </Shell>
    )
  }

  if (!queue || index >= queue.length) {
    return (
      <Summary
        history={history}
        startedAt={startedAt}
        nothingDue={history.length === 0}
        forCollection={!!collectionId}
        onMore={() => {
          queryClient.invalidateQueries({ queryKey: ['learning', 'today'] })
          setQueue(null)
          setIndex(0)
          setHistory([])
          setRepeats({})
          setStartedAt(Date.now())
        }}
      />
    )
  }

  const suggested: Rating | null = check === 'correct' ? 3 : check === 'close' ? 2 : check === 'wrong' ? 1 : null
  const progress = (index / queue.length) * 100
  const definition = definitionOf(word!)
  const showWordFirst = effectiveMode === 'flip'
  const swipeHint = drag.x > 40 ? 'good' : drag.x < -40 ? 'again' : null

  return (
    <Shell
      header={
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pt-4 sm:px-6">
          <Link to="/" aria-label="Exit session" className="rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-fg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <ProgressBar value={progress} />
          </div>
          <span className="w-14 text-right text-sm font-semibold tabular text-muted">{index + 1}/{queue.length}</span>
          <button onClick={() => setAutoPlay(!autoPlay)} aria-pressed={autoPlay} aria-label="Play pronunciation automatically" title="Auto-play pronunciation" className={cx('rounded-xl p-2 transition hover:bg-surface-2', autoPlay ? 'text-accent' : 'text-muted')}>
            {autoPlay ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button onClick={undo} disabled={history.length === 0} aria-label="Undo last answer" title="Undo (Z)" className="rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30">
            <Undo2 className="h-5 w-5" />
          </button>
        </div>
      }
    >
      <div className="mx-auto mb-5 flex max-w-xl flex-wrap items-center justify-center gap-3">
        <Segmented label="Review mode" value={mode} onChange={setMode} options={MODES} />
        {pending > 0 && <Badge tone="warning"><WifiOff className="h-3 w-3" /> {pending} waiting to sync</Badge>}
      </div>

      <div className="mx-auto w-full max-w-xl">
        <div
          className="flip-scene touch-pan-y"
          style={{ transform: `translateX(${drag.x}px) rotate(${drag.x / 40}deg)`, transition: drag.active ? 'none' : 'transform 220ms ease-out' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClick={() => {
            if (moved.current) return
            if (!revealed && !needsTyping) reveal()
          }}
        >
          <div className="flip-card grid" data-flipped={revealed}>
            {/* Front */}
            <Card className="flip-face col-start-1 row-start-1 flex min-h-[22rem] flex-col items-center justify-center p-8 text-center shadow-pop sm:p-12" aria-hidden={revealed} inert={revealed}>
              {card!.leech && <Badge tone="warning" className="mb-4"><Flame className="h-3 w-3" /> Stubborn word</Badge>}
              {showWordFirst ? (
                <>
                  <p className="mb-6 text-xs font-bold uppercase tracking-widest text-muted">What does this mean?</p>
                  <h1 className="break-words text-4xl font-extrabold tracking-tight sm:text-6xl">{word!.word}</h1>
                  {word!.pronunciation && <p className="mt-3 text-muted">{word!.pronunciation}</p>}
                  <button onClick={(e) => { e.stopPropagation(); pronounce(word!) }} aria-label="Play pronunciation" className="mt-5 rounded-full bg-surface-2 p-3 text-muted transition hover:text-accent">
                    <Volume2 className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-5 text-xs font-bold uppercase tracking-widest text-muted">
                    {effectiveMode === 'cloze' ? 'Fill in the blank' : effectiveMode === 'typed' ? 'Type the word' : 'Which word is this?'}
                    {partOfSpeechOf(word!) ? ` · ${partOfSpeechOf(word!)}` : ''}
                  </p>
                  {effectiveMode === 'cloze' && cloze ? (
                    <p className="text-2xl font-semibold leading-relaxed">
                      {cloze.before}
                      <span className="mx-1 inline-block min-w-24 border-b-2 border-accent align-baseline">&nbsp;</span>
                      {cloze.after}
                    </p>
                  ) : (
                    <p className="text-xl font-medium leading-relaxed sm:text-2xl">{definition}</p>
                  )}
                  {effectiveMode === 'cloze' && <p className="mt-4 text-sm text-muted">{definition}</p>}
                  {needsTyping && (
                    <form className="mt-8 flex w-full max-w-sm flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submitTyped() }} onClick={(e) => e.stopPropagation()}>
                      <input
                        ref={inputRef}
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-label="Your answer"
                        placeholder="Type your answer"
                        className="h-12 rounded-xl border border-line bg-surface px-4 text-center text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                      />
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" className="flex-1" onClick={giveUp}>I don&apos;t know</Button>
                        <Button type="submit" className="flex-1" disabled={!typed.trim()}>Check</Button>
                      </div>
                    </form>
                  )}
                </>
              )}
              {!needsTyping && <p className="mt-8 text-xs text-muted">Tap the card or press Space to reveal</p>}
            </Card>

            {/* Back */}
            <Card className="flip-face flip-back relative col-start-1 row-start-1 flex min-h-[22rem] flex-col justify-center p-8 shadow-pop sm:p-12" aria-hidden={!revealed} inert={!revealed} aria-live="polite">
              {swipeHint && (
                <div className={cx('pointer-events-none absolute inset-0 rounded-[var(--radius-card)] border-4', swipeHint === 'good' ? 'border-accent bg-accent/10' : 'border-danger bg-danger/10')} />
              )}
              {check && (
                <div className={cx('mb-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold', check === 'correct' ? 'bg-success-soft text-success' : check === 'close' ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger')}>
                  {check === 'correct' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {check === 'correct' ? 'Correct!' : check === 'close' ? `Almost. You typed “${typed}”` : typed ? `Not quite. You typed “${typed}”` : 'Here is the answer'}
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <h2 className="break-words text-3xl font-extrabold tracking-tight">{word!.word}</h2>
                <button onClick={(e) => { e.stopPropagation(); pronounce(word!) }} aria-label="Play pronunciation" className="shrink-0 rounded-full bg-surface-2 p-2.5 text-muted transition hover:text-accent">
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>
              {word!.pronunciation && <p className="text-muted">{word!.pronunciation}</p>}

              <div className="mt-5 max-h-60 space-y-3 overflow-y-auto pr-1">
                {meaningsFor(word!).length ? (
                  meaningsFor(word!).slice(0, 3).map((m, i) => (
                    <div key={i}>
                      <span className="text-xs font-bold uppercase tracking-wide text-accent">{m.partOfSpeech}</span>
                      <p className="text-lg leading-snug">{m.definitions[0]?.definition}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-lg leading-snug">{definition}</p>
                )}
              </div>
              {exampleOf(word!) && (
                <blockquote className="mt-5 rounded-xl border-l-4 border-accent bg-surface-2 px-4 py-3 text-sm italic text-muted">“{exampleOf(word!)}”</blockquote>
              )}
              {word!.notes && <p className="mt-3 line-clamp-3 text-sm text-muted">📝 {word!.notes}</p>}
            </Card>
          </div>
        </div>

        {/* Answer buttons */}
        <div className="mt-8 min-h-20">
          {!revealed ? (
            !needsTyping && (
              <Button size="lg" className="w-full" onClick={reveal}>
                Show answer <kbd className="rounded border border-on-accent/30 px-1.5 text-xs">Space</kbd>
              </Button>
            )
          ) : (
            <div className="grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 sm:gap-3">
              {([1, 2, 3, 4] as Rating[]).map((r) => (
                <button
                  key={r}
                  data-suggested={suggested === r}
                  onClick={() => grade(r)}
                  className={cx('rounded-2xl border border-line bg-surface px-1 py-3 text-center shadow-card transition active:scale-95 sm:py-4', ratingStyle[r])}
                >
                  <span className="block text-sm font-bold sm:text-base">{RATING_LABEL[r]}</span>
                  <span className="block text-xs text-muted tabular">{formatInterval(card!.intervals?.[r] ?? 1)}</span>
                  <kbd className="mt-1 hidden rounded border border-line px-1.5 text-[10px] text-muted sm:inline-block">{r}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-6 hidden items-center justify-center gap-2 text-xs text-muted sm:flex">
          <Keyboard className="h-3.5 w-3.5" /> Space reveal · 1–4 grade · Z undo · P pronounce · Esc exit
        </p>
        {revealed && <p className="mt-4 text-center text-xs text-muted sm:hidden">Swipe right for Good, left for Again</p>}
      </div>
    </Shell>
  )
}

function Shell({ header, children }: { header?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {header}
      <main className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}

function Summary({ history, startedAt, nothingDue, forCollection, onMore }: { history: HistoryEntry[]; startedAt: number; nothingDue: boolean; forCollection: boolean; onMore: () => void }) {
  const [seconds] = useState(() => Math.round((Date.now() - startedAt) / 1000)) // fixed when the summary first appears
  const counts = ([1, 2, 3, 4] as Rating[]).map((r) => ({ rating: r, count: history.filter((h) => h.rating === r).length }))
  const recalled = history.filter((h) => h.rating >= 2).length
  const accuracy = history.length ? Math.round((recalled / history.length) * 100) : 0
  const hardest = [...new Map(history.filter((h) => h.rating <= 2).map((h) => [h.wordId, h])).values()].slice(0, 8)
  const minutes = Math.floor(seconds / 60)

  return (
    <Shell>
      <Card className="mx-auto w-full max-w-lg p-8 text-center shadow-pop">
        <div className="pop mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">{nothingDue ? 'Nothing due right now' : 'Session complete'}</h2>
        <p className="mt-1 text-muted">
          {nothingDue ? `You are all caught up${forCollection ? ' in this collection' : ''}.` : 'Nice work. Your next reviews are scheduled.'}
        </p>

        {!nothingDue && (
          <>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: 'Reviewed', value: history.length },
                { label: 'Recalled', value: `${accuracy}%` },
                { label: 'Time', value: minutes ? `${minutes}m` : `${seconds}s` },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-surface-2 p-3">
                  <p className="text-xl font-extrabold tabular">{s.value}</p>
                  <p className="text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 text-left">
              {counts.map(({ rating, count }) => (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-medium text-muted">{RATING_LABEL[rating]}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className={cx('h-full rounded-full', rating === 1 ? 'bg-danger' : rating === 2 ? 'bg-warning' : rating === 3 ? 'bg-accent' : 'bg-success')} style={{ width: `${history.length ? (count / history.length) * 100 : 0}%` }} />
                  </div>
                  <span className="w-6 text-right font-semibold tabular">{count}</span>
                </div>
              ))}
            </div>

            {hardest.length > 0 && (
              <div className="mt-6 text-left">
                <p className="mb-2 text-sm font-bold">Words to revisit</p>
                <div className="flex flex-wrap gap-2">
                  {hardest.map((h) => (
                    <Link key={h.wordId} to={`/vocabulary/${h.wordId}`} className="rounded-lg bg-warning-soft px-2.5 py-1 text-sm font-medium text-warning hover:brightness-95">{h.word}</Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/" className={buttonClass('primary', 'lg')}>Back to dashboard</Link>
          {!nothingDue && (
            <Button variant="secondary" size="lg" onClick={onMore}><RotateCcw className="h-4 w-4" /> Keep going</Button>
          )}
        </div>
      </Card>
    </Shell>
  )
}
