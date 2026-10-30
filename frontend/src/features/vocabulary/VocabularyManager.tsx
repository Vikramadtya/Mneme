import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BookOpen, Edit2, FileUp, Flame, Loader2, Plus, Search, Sparkles, Trash2, Volume2, Wand2 } from 'lucide-react'
import {
  requestAiSuggestion, useAddVocabulary, useBulkAdd, useCollections, useDeleteVocabulary, useMyVocabulary, useUpdateVocabulary,
  type AiSuggestion, type VocabularyCollection, type VocabularyItem,
} from './api'
import { fetchApi, ApiError } from '../../api/client'
import { parseImport } from './importParsing'
import { pronounce } from './pronounce'
import { useWordStatuses, type WordStatus } from '../learning/api'
import { useSettings } from '../settings/api'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Segmented, Select, Skeleton, Textarea, cx } from '../../ui'
import { useDebounced } from '../../ui/hooks'

type StatusFilter = 'all' | 'new' | 'learning' | 'mastered' | 'due' | 'leech'
type Sort = 'newest' | 'oldest' | 'az' | 'za' | 'hardest'
const PAGE = 100

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'leech', label: 'Stubborn' },
]

const definitionOf = (w: VocabularyItem) => w.definitions?.[0] || w.meanings?.[0]?.definitions?.[0]?.definition || ''

function statusBadge(status?: WordStatus) {
  if (!status) return null
  if (status.leech) return <Badge tone="warning"><Flame className="h-3 w-3" />Stubborn</Badge>
  if (status.state === 'GRADUATED') return <Badge tone="success">Mastered</Badge>
  if (status.state === 'NEW') return <Badge tone="neutral">New</Badge>
  return <Badge tone="accent">Learning</Badge>
}

export function VocabularyManager() {
  const { data: words, isLoading } = useMyVocabulary()
  const { data: collections } = useCollections()
  const { data: statuses } = useWordStatuses()
  const { data: settings } = useSettings()
  const addWord = useAddVocabulary()
  const updateWord = useUpdateVocabulary()
  const deleteWord = useDeleteVocabulary()

  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const query = useDebounced(search.trim().toLowerCase(), 150)
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [status, setStatus] = useState<StatusFilter>((params.get('status') as StatusFilter) || 'all')
  const [sort, setSort] = useState<Sort>('newest')
  const [visible, setVisible] = useState(PAGE)

  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<VocabularyItem | null>(null)
  const [defaultCollection, setDefaultCollection] = useState('')
  const [toDelete, setToDelete] = useState<VocabularyItem | null>(null)

  const collectionByWord = useMemo(() => {
    const map = new Map<string, VocabularyCollection>()
    for (const c of collections ?? []) for (const id of c.wordIds ?? []) map.set(id, c)
    return map
  }, [collections])
  const statusByWord = useMemo(() => new Map((statuses ?? []).map((s) => [s.wordId, s])), [statuses])

  const openAdd = (collectionId = '') => {
    setEditing(null)
    setDefaultCollection(collectionId || (collectionFilter !== 'all' ? collectionFilter : ''))
    setFormOpen(true)
  }

  // Deep links: ?addWord=true&collectionId=…, ?import=true
  useEffect(() => {
    if (!collections) return
    if (params.get('addWord') === 'true') {
      openAdd(params.get('collectionId') || '')
      setParams({}, { replace: true })
    } else if (params.get('import') === 'true') {
      setImportOpen(true)
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, collections])

  const filtered = useMemo(() => {
    let result = words ?? []
    if (collectionFilter !== 'all') {
      const ids = new Set(collections?.find((c) => c.id === collectionFilter)?.wordIds ?? [])
      result = result.filter((w) => ids.has(w.id))
    }
    if (status !== 'all') {
      const now = Date.now()
      result = result.filter((w) => {
        const s = statusByWord.get(w.id)
        if (!s) return status === 'new'
        switch (status) {
          case 'new': return s.state === 'NEW'
          case 'learning': return s.state === 'LEARNING'
          case 'mastered': return s.state === 'GRADUATED'
          case 'due': return new Date(s.nextReviewAt).getTime() <= now
          case 'leech': return s.leech
        }
      })
    }
    if (query) {
      result = result.filter((w) => w.word.toLowerCase().includes(query) || definitionOf(w).toLowerCase().includes(query))
    }
    const time = (w: VocabularyItem) => new Date(w.createdAt || 0).getTime()
    return [...result].sort((a, b) => {
      switch (sort) {
        case 'oldest': return time(a) - time(b)
        case 'az': return a.word.localeCompare(b.word)
        case 'za': return b.word.localeCompare(a.word)
        case 'hardest': return (statusByWord.get(b.id)?.lapses ?? 0) - (statusByWord.get(a.id)?.lapses ?? 0) || time(b) - time(a)
        default: return time(b) - time(a)
      }
    })
  }, [words, collections, collectionFilter, status, query, sort, statusByWord])

  useEffect(() => setVisible(PAGE), [query, collectionFilter, status, sort])

  const grouped = sort === 'newest' || sort === 'oldest'
  const dayLabel = (w: VocabularyItem) => new Date(w.createdAt || 0).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const shown = filtered.slice(0, visible)

  return (
    <div>
      <PageHeader
        title="Vocabulary"
        subtitle={words ? `${words.length} ${words.length === 1 ? 'word' : 'words'}` : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}><FileUp className="h-4 w-4" /><span className="hidden sm:inline">Import</span></Button>
            <Button onClick={() => openAdd()}><Plus className="h-4 w-4" />Add word</Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input aria-label="Search words" placeholder="Search words and definitions…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            {collections && collections.length > 0 && (
              <Select aria-label="Filter by collection" value={collectionFilter} onChange={(e) => setCollectionFilter(e.target.value)} className="sm:w-48">
                <option value="all">All collections</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="sm:w-40">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="az">A → Z</option>
              <option value="za">Z → A</option>
              <option value="hardest">Hardest first</option>
            </Select>
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <Segmented label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title={words?.length ? 'No words match' : 'No words yet'}
              action={!words?.length && <Button onClick={() => openAdd()}><Plus className="h-4 w-4" />Add your first word</Button>}
            >
              {words?.length ? 'Try a different search or clear the filters.' : 'Add a word, or import a whole list at once.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map((word, i) => {
                const col = collectionByWord.get(word.id)
                const label = grouped ? dayLabel(word) : ''
                const newDay = grouped && (i === 0 || label !== dayLabel(shown[i - 1]))
                return (
                  <React.Fragment key={word.id}>
                    {newDay && <li className="bg-surface-2/60 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-muted" aria-hidden>{label}</li>}
                    <li className="group flex items-center gap-2 px-3 py-3 transition hover:bg-surface-2/50 sm:px-5">
                      <Link to={`/vocabulary/${word.id}`} className="min-w-0 flex-1 rounded-lg py-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <h3 className="text-base font-bold group-hover:text-accent">{word.word}</h3>
                          {word.pronunciation && <span className="text-sm text-muted">{word.pronunciation}</span>}
                          {statusBadge(statusByWord.get(word.id))}
                          {col && col.name !== 'Inbox' && <Badge tone="accent">{col.name}</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted">{definitionOf(word)}</p>
                      </Link>
                      <div className="flex shrink-0 items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <IconButton label={`Pronounce ${word.word}`} onClick={() => pronounce(word)}><Volume2 className="h-4 w-4" /></IconButton>
                        <IconButton label={`Edit ${word.word}`} onClick={() => { setEditing(word); setFormOpen(true) }}><Edit2 className="h-4 w-4" /></IconButton>
                        <IconButton label={`Delete ${word.word}`} danger onClick={() => setToDelete(word)}><Trash2 className="h-4 w-4" /></IconButton>
                      </div>
                    </li>
                  </React.Fragment>
                )
              })}
            </ul>
          )}
          {filtered.length > visible && (
            <div className="border-t border-line p-4 text-center">
              <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>Show more ({filtered.length - visible} left)</Button>
            </div>
          )}
        </div>
      </Card>

      <WordFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        collections={collections ?? []}
        initialCollectionId={editing ? collectionByWord.get(editing.id)?.id ?? '' : defaultCollection}
        aiEnabled={!!settings?.aiEnabled}
        saving={addWord.isPending || updateWord.isPending}
        onSave={(item, collectionId) => {
          const done = { onSuccess: () => setFormOpen(false) }
          if (editing) updateWord.mutate({ id: editing.id, item, collectionId }, done)
          else addWord.mutate({ item, collectionId }, done)
        }}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} collections={collections ?? []} onDone={() => navigate('/vocabulary', { replace: true })} />
      <ConfirmDialog
        open={!!toDelete}
        title={`Delete “${toDelete?.word}”?`}
        message="This removes the word, its progress and its place in every collection. It cannot be undone."
        loading={deleteWord.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={() => { if (toDelete) deleteWord.mutate(toDelete.id, { onSettled: () => setToDelete(null) }) }}
      />
    </div>
  )
}

function IconButton({ label, danger, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return <button aria-label={label} title={label} className={cx('rounded-lg p-2 text-muted transition hover:bg-surface-2', danger ? 'hover:text-danger' : 'hover:text-accent')} {...rest} />
}

/* ---------------- Add / edit ---------------- */

function WordFormModal({ open, onClose, editing, collections, initialCollectionId, aiEnabled, saving, onSave }: {
  open: boolean
  onClose: () => void
  editing: VocabularyItem | null
  collections: VocabularyCollection[]
  initialCollectionId: string
  aiEnabled: boolean
  saving: boolean
  onSave: (item: Partial<VocabularyItem>, collectionId: string) => void
}) {
  const [word, setWord] = useState('')
  const [definition, setDefinition] = useState('')
  const [example, setExample] = useState('')
  const [pronunciation, setPronunciation] = useState('')
  const [notes, setNotes] = useState('')
  const [synonyms, setSynonyms] = useState<string[]>([])
  const [collectionId, setCollectionId] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [thinking, setThinking] = useState(false)
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null)

  useEffect(() => {
    if (!open) return
    setWord(editing?.word ?? '')
    setDefinition(editing?.definitions?.[0] ?? editing?.meanings?.[0]?.definitions?.[0]?.definition ?? '')
    setExample(editing?.examples?.[0] ?? '')
    setPronunciation(editing?.pronunciation ?? '')
    setNotes(editing?.notes ?? '')
    setSynonyms(editing?.synonyms ?? [])
    setLookupError('')
    setSuggestion(null)
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    const inbox = collections.find((c) => c.name === 'Inbox') ?? collections[0]
    setCollectionId(initialCollectionId || inbox?.id || '')
  }, [open, initialCollectionId, collections])

  const autofill = async () => {
    if (!word.trim()) return
    setLookingUp(true)
    setLookupError('')
    try {
      const data = await fetchApi<{ definition?: string; example?: string; pronunciation?: string; synonyms?: string[] }>(`/dictionary/${encodeURIComponent(word.trim().toLowerCase())}`)
      if (!data.definition) setLookupError('No dictionary entry found. You can still write your own definition.')
      if (data.definition) setDefinition(data.definition)
      if (data.example) setExample(data.example)
      if (data.pronunciation) setPronunciation(data.pronunciation)
      if (data.synonyms?.length) setSynonyms(data.synonyms)
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'The dictionary is unavailable right now.')
    } finally {
      setLookingUp(false)
    }
  }

  const askAi = async () => {
    setThinking(true)
    try {
      setSuggestion(await requestAiSuggestion(word.trim(), definition || undefined))
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 429 ? 'Slow down a little and try again in a minute.' : 'AI suggestions are unavailable right now.')
    } finally {
      setThinking(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim()) return
    onSave(
      {
        word: word.trim(),
        definitions: definition.trim() ? [definition.trim()] : [],
        examples: example.trim() ? [example.trim()] : [],
        pronunciation: pronunciation.trim(),
        notes,
        ...(synonyms.length && { synonyms }),
      },
      collectionId,
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit word' : 'Add a word'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Word">
            {(id) => (
              <div className="flex gap-2">
                <Input id={id} value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g. ubiquitous" required maxLength={100} autoComplete="off" />
                <Button type="button" variant="soft" onClick={autofill} disabled={lookingUp || !word.trim()} aria-label="Fill in from dictionary" title="Fill in from dictionary">
                  {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </Field>
          <Field label="Collection">
            {(id) => (
              <Select id={id} value={collectionId} onChange={(e) => setCollectionId(e.target.value)} required>
                <option value="" disabled>Choose a collection</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            )}
          </Field>
        </div>
        {lookupError && <p className="text-sm text-danger" role="alert">{lookupError}</p>}

        <Field label="Definition" hint={editing ? undefined : 'Leave empty and it is filled in from the dictionary when you save.'}>
          {(id) => <Input id={id} value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="Present everywhere" maxLength={2000} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Example sentence">
            {(id) => <Input id={id} value={example} onChange={(e) => setExample(e.target.value)} placeholder="Smartphones are ubiquitous." maxLength={2000} />}
          </Field>
          <Field label="Pronunciation">
            {(id) => <Input id={id} value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} placeholder="/juːˈbɪkwɪtəs/" maxLength={100} />}
          </Field>
        </div>
        <Field label="Notes">
          {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="A mnemonic or anything you want to remember" maxLength={10000} />}
        </Field>

        {aiEnabled && (
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold"><Sparkles className="h-4 w-4 text-accent" />AI suggestions</p>
                <p className="text-xs text-muted">Example sentences, a mnemonic and synonyms. Only the word is sent.</p>
              </div>
              <Button type="button" variant="soft" size="sm" onClick={askAi} loading={thinking} disabled={!word.trim()}>Suggest</Button>
            </div>
            {suggestion && (
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Examples <span className="font-normal normal-case">(click to use)</span></p>
                  <ul className="space-y-1">
                    {suggestion.examples.map((ex) => (
                      <li key={ex}><button type="button" onClick={() => setExample(ex)} className="w-full rounded-lg px-2 py-1.5 text-left italic hover:bg-accent-soft">“{ex}”</button></li>
                    ))}
                  </ul>
                </div>
                {suggestion.mnemonic && (
                  <button type="button" onClick={() => setNotes((n) => (n ? `${n}\n${suggestion.mnemonic}` : suggestion.mnemonic))} className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-accent-soft">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted">Mnemonic (add to notes)</span><br />{suggestion.mnemonic}
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{suggestion.level}</Badge>
                  {suggestion.synonyms.map((s) => (
                    <button key={s} type="button" onClick={() => setSynonyms((cur) => [...new Set([...cur, s])])} className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent hover:brightness-95">+ {s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Save word'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------------- Bulk import ---------------- */

const CHUNK = 200

function ImportModal({ open, onClose, collections, onDone }: { open: boolean; onClose: () => void; collections: VocabularyCollection[]; onDone: () => void }) {
  const bulk = useBulkAdd()
  const [text, setText] = useState('')
  const [collectionId, setCollectionId] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const parsed = useMemo(() => parseImport(text), [text])

  useEffect(() => {
    if (!open) return
    setText('')
    setProgress(null)
    setCollectionId((collections.find((c) => c.name === 'Inbox') ?? collections[0])?.id ?? '')
  }, [open, collections])

  const readFile = async (file: File) => {
    if (file.size > 2_000_000) return toast.error('That file is too large. Keep it under 2 MB.')
    setText(await file.text())
  }

  const run = async () => {
    const total = parsed.items.length
    let created = 0
    let skipped = 0
    let failed = 0
    setProgress({ done: 0, total })
    try {
      for (let i = 0; i < total; i += CHUNK) {
        const result = await bulk.mutateAsync({ items: parsed.items.slice(i, i + CHUNK), collectionId })
        created += result.created
        skipped += result.skipped.length
        failed += result.failed.length
        setProgress({ done: Math.min(total, i + CHUNK), total })
      }
      toast.success(`Added ${created} ${created === 1 ? 'word' : 'words'}${skipped ? `, ${skipped} already existed` : ''}${failed ? `, ${failed} failed` : ''}.`)
      onClose()
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
      setProgress(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import words" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Paste a list (one word per line) or a CSV with columns <strong className="text-fg">word, definition, example</strong>. Anki text exports work too. Missing definitions are filled in from the dictionary.
        </p>
        <Textarea aria-label="Words to import" value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={'ubiquitous\nephemeral, lasting a very short time\n"serendipity","finding good things by chance","A happy serendipity."'} className="font-mono text-[13px]" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:bg-surface-2 focus-within:outline focus-within:outline-2 focus-within:outline-accent">
            <FileUp className="h-4 w-4" /> Choose file
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = '' }} />
          </label>
          <Select aria-label="Add to collection" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="w-48">
            {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <p className="ml-auto text-sm text-muted tabular" aria-live="polite">
            {parsed.items.length} {parsed.items.length === 1 ? 'word' : 'words'} found{parsed.ignored ? `, ${parsed.ignored} skipped` : ''}
          </p>
        </div>
        {parsed.items.length > 0 && (
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded-xl bg-surface-2/60 p-3 text-sm" aria-label="Preview">
            {parsed.items.slice(0, 6).map((item, i) => (
              <li key={`${item.word}-${i}`} className="flex gap-2">
                <span className="font-semibold">{item.word}</span>
                <span className="truncate text-muted">{item.definitions?.[0] ?? 'definition from dictionary'}</span>
              </li>
            ))}
            {parsed.items.length > 6 && <li className="text-xs text-muted">and {parsed.items.length - 6} more</li>}
          </ul>
        )}
        {progress && (
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-accent transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={run} loading={bulk.isPending} disabled={!parsed.items.length || !collectionId}>Import {parsed.items.length || ''}</Button>
        </div>
      </div>
    </Modal>
  )
}
