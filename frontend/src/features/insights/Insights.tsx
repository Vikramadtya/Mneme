import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Flame, Layers, Repeat, Trophy } from 'lucide-react'
import { useAnalyticsSummary } from '../analytics/api'
import { Heatmap } from './Heatmap'
import { Card, EmptyState, PageHeader, ProgressBar, Skeleton, Stat } from '../../ui'

const CONFIDENCE = [
  { key: 'high', name: 'Confident', color: 'var(--success)' },
  { key: 'medium', name: 'Learning', color: 'var(--warning)' },
  { key: 'low', name: 'Needs work', color: 'var(--danger)' },
] as const

const tooltipStyle = { borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--fg)', boxShadow: 'var(--shadow)' }

export function Insights() {
  const { data, isLoading } = useAnalyticsSummary()

  if (isLoading || !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-9 w-40" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  const activity = data.activity.map((d) => ({
    // Noon avoids the day shifting when a bare YYYY-MM-DD is parsed as UTC.
    name: new Date(`${d.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Reviews: d.reviews,
    'New words': d.newWords,
  }))
  const confidence = CONFIDENCE.map((c) => ({ ...c, value: data.confidence[c.key] }))
  const totalWords = confidence.reduce((sum, c) => sum + c.value, 0)
  const activeDays = data.heatmap.filter((d) => d.count > 0).length

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="How your learning is going." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Flame className="h-5 w-5" />} label="Current streak" value={data.streak.current} suffix=" d" tone="warning" />
        <Stat icon={<Trophy className="h-5 w-5" />} label="Longest streak" value={data.streak.longest} suffix=" d" tone="accent" />
        <Stat icon={<Repeat className="h-5 w-5" />} label="Reviews, last year" value={data.totalReviews} tone="success" />
        <Stat icon={<Layers className="h-5 w-5" />} label="Active days" value={activeDays} tone="neutral" />
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-bold">Review calendar</h2>
        <Heatmap days={data.heatmap} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold">Last 30 days</h2>
          <div className="h-64" role="img" aria-label="Reviews and new words per day for the last 30 days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} interval={4} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
                <Bar dataKey="Reviews" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="New words" fill="var(--success)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-2 font-bold">Confidence</h2>
          {totalWords === 0 ? (
            <EmptyState icon={<Layers className="h-6 w-6" />} title="No words yet">Add words to see how well you know them.</EmptyState>
          ) : (
            <>
              <div className="relative h-48" role="img" aria-label={`${data.confidence.high} confident, ${data.confidence.medium} learning, ${data.confidence.low} need work`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={confidence} dataKey="value" innerRadius={56} outerRadius={78} paddingAngle={3} stroke="none">
                      {confidence.map((c) => <Cell key={c.key} fill={c.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tabular">{totalWords}</span>
                  <span className="text-xs text-muted">words</span>
                </div>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {confidence.map((c) => (
                  <li key={c.key} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-semibold tabular">{c.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-bold">Collections</h2>
        {data.collections.length === 0 ? (
          <p className="text-sm text-muted">Create a collection to see how well you do in each.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.collections.map((c) => (
              <li key={c.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-xs text-muted">{c.wordCount} {c.wordCount === 1 ? 'word' : 'words'}</p>
                </div>
                <div className="w-32 sm:w-48">
                  <ProgressBar value={c.accuracyPercent} />
                </div>
                <span className="w-12 text-right text-sm font-bold tabular">{c.accuracyPercent}%</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
