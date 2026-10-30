import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Award, BookOpen, ChevronRight, Clock, Flame, Play, Plus, Sparkles, Target, TriangleAlert } from 'lucide-react'
import { useDashboardOverview } from './api'
import { GoalRing } from './GoalRing'
import { useAnalyticsSummary } from '../analytics/api'
import { Heatmap } from '../insights/Heatmap'
import { Button, Card, Select, Skeleton, Stat, buttonClass } from '../../ui'

function greeting() {
  const hour = new Date().getHours()
  return hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export function Dashboard() {
  const navigate = useNavigate()
  const { data: overview, isLoading, isError } = useDashboardOverview()
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary()
  const [collectionId, setCollectionId] = useState('all')

  const stats = overview?.stats
  const collections = overview?.collections ?? []
  const due = stats?.dueCount ?? 0
  const fresh = stats?.newCount ?? 0
  const nothingToDo = due === 0 && fresh === 0
  const streak = analytics?.streak
  const today = analytics?.today

  const start = () => navigate(collectionId === 'all' ? '/session' : `/session?collectionId=${collectionId}`)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{greeting()}.</h1>
        <p className="mt-1 text-muted">
          {isLoading ? 'Checking what is due…' : nothingToDo ? 'You are all caught up. Add a few words to keep growing.' : 'Ready to expand your vocabulary?'}
        </p>
      </header>

      {isError && (
        <Card className="flex items-start gap-3 border-danger/30 bg-danger-soft p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <h3 className="font-bold text-danger">Cannot reach the server</h3>
            <p className="text-sm text-danger/90">The backend may be waking up or you may be offline. Try again in a moment.</p>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 sm:p-8 lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">Today&apos;s session</h2>
                {isLoading ? <Skeleton className="mt-2 h-5 w-64" /> : (
                  <p className="mt-1 max-w-sm text-muted">
                    <strong className="text-fg">{due} due</strong> for review and <strong className="text-fg">{fresh} new</strong> to learn.
                  </p>
                )}
              </div>
              <div className="hidden sm:block">
                {today ? <GoalRing done={today.reviews} goal={today.goal} /> : <Skeleton className="h-[132px] w-[132px] rounded-full" />}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={start} disabled={isError || nothingToDo} className="sm:min-w-44">
                <Play className="h-5 w-5" /> Start learning <ChevronRight className="h-5 w-5" />
              </Button>
              {collections.length > 0 && (
                <Select aria-label="Collection to study" value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="h-12 sm:w-56">
                  <option value="all">All collections</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${streak?.current ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-muted'}`}>
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Day streak</p>
              {analyticsLoading ? <Skeleton className="mt-1 h-7 w-12" /> : (
                <p className="text-2xl font-extrabold tracking-tight tabular">{streak?.current ?? 0}<span className="ml-2 text-xs font-medium text-muted">best {streak?.longest ?? 0}</span></p>
              )}
            </div>
          </Card>
          <Card className="p-5 sm:hidden">
            {today && <div className="flex justify-center"><GoalRing done={today.reviews} goal={today.goal} size={120} /></div>}
          </Card>
          {(stats?.leechCount ?? 0) > 0 ? (
            <Card className="flex items-start gap-3 p-5">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-bold">{stats!.leechCount} stubborn {stats!.leechCount === 1 ? 'word' : 'words'}</p>
                <p className="text-muted">Words you keep forgetting. Try a new example or mnemonic.</p>
                <Link to="/vocabulary?status=leech" className="mt-1 inline-block font-semibold text-accent hover:underline">Review them</Link>
              </div>
            </Card>
          ) : (
            <Card className="flex items-start gap-3 p-5">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="text-sm">
                <p className="font-bold">Tip</p>
                <p className="text-muted">Press <kbd className="rounded border border-line px-1 text-xs">Space</kbd> to flip a card and <kbd className="rounded border border-line px-1 text-xs">1–4</kbd> to grade it.</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Clock className="h-5 w-5" />} label="Due for review" value={due} tone="warning" loading={isLoading} />
        <Stat icon={<BookOpen className="h-5 w-5" />} label="New words" value={fresh} tone="success" loading={isLoading} />
        <Stat icon={<Target className="h-5 w-5" />} label="Retention" value={stats?.accuracyPercent ?? 0} suffix="%" loading={isLoading} />
        <Stat icon={<Award className="h-5 w-5" />} label="Total words" value={stats?.totalWords ?? 0} tone="accent" loading={isLoading} />
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Recent activity</h2>
          <Link to="/insights" className="text-sm font-semibold text-accent hover:underline">All insights</Link>
        </div>
        {analytics ? <Heatmap days={analytics.heatmap} weeks={20} /> : <Skeleton className="h-28 w-full" />}
      </Card>

      {!isLoading && stats?.totalWords === 0 && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <h3 className="text-lg font-bold">Start your library</h3>
          <p className="max-w-md text-sm text-muted">Add your first word, or paste a whole list and let Memoriser fill in definitions, examples and pronunciation.</p>
          <div className="flex gap-2">
            <Link to="/vocabulary?addWord=true" className={buttonClass('primary')}><Plus className="h-4 w-4" /> Add a word</Link>
            <Link to="/vocabulary?import=true" className={buttonClass('secondary')}>Import a list</Link>
          </div>
        </Card>
      )}
    </div>
  )
}
