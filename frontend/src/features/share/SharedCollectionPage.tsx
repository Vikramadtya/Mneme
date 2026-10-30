import { GoogleLogin } from '@react-oauth/google'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertCircle, BookOpen, Download } from 'lucide-react'
import { isSignedIn } from '../../api/auth'
import { useGoogleSignIn } from '../auth/useGoogleSignIn'
import { useImportShared, useSharedCollection } from './api'
import { Button, buttonClass, Card, Skeleton } from '../../ui'
import { ThemeToggle } from '../../ui/ThemeToggle'

export function SharedCollectionPage() {
  const { shareId = '' } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useSharedCollection(shareId)
  const importShared = useImportShared()
  const signIn = useGoogleSignIn()
  const signedIn = isSignedIn()

  const doImport = () =>
    importShared.mutate(shareId, {
      onSuccess: (r) => {
        toast.success(r.imported ? `Added ${r.imported} ${r.imported === 1 ? 'word' : 'words'}${r.skipped ? ` (${r.skipped} you already had)` : ''}` : 'You already have all of these words.')
        navigate('/collections')
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Import failed'),
    })

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/brain-svgrepo-com.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-extrabold tracking-tight">Memoriser</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
        ) : error || !data ? (
          <Card className="p-10 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted" />
            <h1 className="text-lg font-bold">Collection not available</h1>
            <p className="mt-1 text-sm text-muted">{error instanceof Error ? error.message : 'Something went wrong.'}</p>
            <Link to="/" className={buttonClass('secondary', 'md', 'mt-5')}>Go to Memoriser</Link>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">Shared collection</p>
                <h1 className="text-3xl font-extrabold tracking-tight">{data.name}</h1>
                {data.description && <p className="mt-1 text-muted">{data.description}</p>}
                <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-muted"><BookOpen className="h-4 w-4" />{data.wordCount} {data.wordCount === 1 ? 'word' : 'words'}</p>
              </div>
              {signedIn ? (
                <Button size="lg" onClick={doImport} loading={importShared.isPending}><Download className="h-5 w-5" />Add to my words</Button>
              ) : (
                <div className="text-right">
                  <p className="mb-2 text-sm text-muted">Sign in to add these words to your own library.</p>
                  <GoogleLogin onSuccess={signIn.onSuccess} onError={signIn.onError} shape="pill" text="continue_with" />
                </div>
              )}
            </div>

            <Card className="divide-y divide-line">
              {data.words.map((w) => (
                <article key={w.word} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h2 className="text-lg font-bold">{w.word}</h2>
                    {w.pronunciation && <span className="text-sm text-muted">{w.pronunciation}</span>}
                  </div>
                  <p className="mt-1 text-muted">{w.definitions?.[0] ?? w.meanings?.[0]?.definitions?.[0]?.definition}</p>
                  {w.examples?.[0] && <p className="mt-1 text-sm italic text-muted">“{w.examples[0]}”</p>}
                </article>
              ))}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
