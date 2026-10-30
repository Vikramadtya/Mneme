import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BookOpen, Check, Copy, Edit2, Globe, Layers, Link2Off, ListChecks, Play, Plus, Trash2 } from 'lucide-react'
import {
  useCollections, useCreateCollection, useDeleteCollection, useMyVocabulary, useShareCollection, useUpdateCollection, useUpdateCollectionWords,
  type VocabularyCollection,
} from '../vocabulary/api'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Skeleton, cx } from '../../ui'

const shareUrl = (shareId: string) => `${window.location.origin}/s/${shareId}`

export function CollectionsManager() {
  const navigate = useNavigate()
  const { data: collections, isLoading } = useCollections()
  const { data: allWords } = useMyVocabulary()
  const create = useCreateCollection()
  const update = useUpdateCollection()
  const remove = useDeleteCollection()
  const setWords = useUpdateCollectionWords()
  const share = useShareCollection()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<VocabularyCollection | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [assigning, setAssigning] = useState<VocabularyCollection | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [toDelete, setToDelete] = useState<VocabularyCollection | null>(null)

  const openForm = (col: VocabularyCollection | null) => {
    setEditing(col)
    setName(col?.name ?? '')
    setDescription(col?.description ?? '')
    setFormOpen(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const done = { onSuccess: () => setFormOpen(false), onError: () => toast.error('Could not save the collection') }
    if (editing) update.mutate({ id: editing.id, name: name.trim(), description }, done)
    else create.mutate({ name: name.trim(), description }, done)
  }

  const toggleShare = (col: VocabularyCollection, on: boolean) =>
    share.mutate(
      { id: col.id, share: on },
      {
        onSuccess: async (res) => {
          if (on && res.shareId) {
            await navigator.clipboard?.writeText(shareUrl(res.shareId)).catch(() => undefined)
            toast.success('Sharing is on. The link was copied.')
          } else if (!on) toast.success('Sharing stopped. The link no longer works.')
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not change sharing'),
      },
    )

  const copyLink = async (col: VocabularyCollection) => {
    if (!col.shareId) return
    try {
      await navigator.clipboard.writeText(shareUrl(col.shareId))
      toast.success('Link copied')
    } catch {
      toast(shareUrl(col.shareId))
    }
  }

  const assignable = useMemo(() => [...(allWords ?? [])].sort((a, b) => a.word.localeCompare(b.word)), [allWords])
  const deleteCount = toDelete?.wordIds?.length ?? 0

  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle="Group words into lists to study them together."
        actions={<Button onClick={() => openForm(null)}><Plus className="h-4 w-4" />New collection</Button>}
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : !collections?.length ? (
        <Card className="border-dashed">
          <EmptyState icon={<Layers className="h-6 w-6" />} title="No collections yet" action={<Button onClick={() => openForm(null)}>Create your first collection</Button>}>
            Group your words into lists for targeted learning.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {collections.map((col) => {
            const isInbox = col.name === 'Inbox'
            return (
              <Card key={col.id} className="flex flex-col p-5 transition hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-lg font-bold">
                      <span className="truncate">{col.name}</span>
                      {col.shareId && <Badge tone="success"><Globe className="h-3 w-3" />Shared</Badge>}
                    </h3>
                    {col.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{col.description}</p>}
                  </div>
                  <div className="flex shrink-0">
                    {!isInbox && <button aria-label={`Edit ${col.name}`} onClick={() => openForm(col)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-accent"><Edit2 className="h-4 w-4" /></button>}
                    <button aria-label={`Delete ${col.name}`} onClick={() => setToDelete(col)} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-accent">
                  <BookOpen className="h-4 w-4" />{col.wordIds?.length ?? 0} {col.wordIds?.length === 1 ? 'word' : 'words'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate(`/session?collectionId=${col.id}`)} disabled={!col.wordIds?.length}><Play className="h-3.5 w-3.5" />Study</Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/vocabulary?addWord=true&collectionId=${col.id}`)}><Plus className="h-3.5 w-3.5" />Add word</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setAssigning(col); setSelected(new Set(col.wordIds ?? [])) }}><ListChecks className="h-3.5 w-3.5" />Manage</Button>
                  {!isInbox && (col.shareId ? (
                    <>
                      <Button size="sm" variant="soft" onClick={() => copyLink(col)}><Copy className="h-3.5 w-3.5" />Copy link</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleShare(col, false)} loading={share.isPending && share.variables?.id === col.id}><Link2Off className="h-3.5 w-3.5" />Stop sharing</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => toggleShare(col, true)} disabled={!col.wordIds?.length} loading={share.isPending && share.variables?.id === col.id}><Globe className="h-3.5 w-3.5" />Share</Button>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit collection' : 'New collection'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TOEFL essentials" required maxLength={60} />}</Field>
          <Field label="Description (optional)">{(id) => <Input id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />}</Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={create.isPending || update.isPending}>{editing ? 'Save changes' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title={`Words in “${assigning?.name ?? ''}”`} size="lg">
        {assignable.length === 0 ? (
          <p className="text-sm text-muted">You have no words yet.</p>
        ) : (
          <>
            <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
              {assignable.map((w) => {
                const on = selected.has(w.id)
                return (
                  <button
                    key={w.id}
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setSelected((cur) => { const next = new Set(cur); if (on) next.delete(w.id); else next.add(w.id); return next })}
                    className={cx('flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition', on ? 'border-accent bg-accent-soft text-accent' : 'border-transparent bg-surface-2 hover:border-line')}
                  >
                    <span className="truncate">{w.word}</span>
                    {on && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-muted tabular">{selected.size} selected</span>
              <Button loading={setWords.isPending} onClick={() => assigning && setWords.mutate({ id: assigning.id, wordIds: [...selected] }, { onSuccess: () => setAssigning(null) })}>Save</Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title={`Delete “${toDelete?.name}”?`}
        message={deleteCount ? `This also permanently deletes the ${deleteCount} ${deleteCount === 1 ? 'word' : 'words'} inside it, along with their progress. Move words to another collection first if you want to keep them.` : 'This collection is empty, so no words are affected.'}
        loading={remove.isPending}
        confirmLabel={deleteCount ? `Delete collection and ${deleteCount} ${deleteCount === 1 ? 'word' : 'words'}` : 'Delete'}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) })}
      />
    </div>
  )
}
