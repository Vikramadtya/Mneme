import { useState } from 'react'
import { Bell, Download, LogOut, Monitor, Moon, Sun, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { signOut } from '../../api/auth'
import { exportData, importData } from '../learning/dataApi'
import { disablePush, enablePush, pushSupported, useSettings, useUpdateSettings } from './api'
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Segmented, Select, Skeleton } from '../../ui'
import { useTheme } from '../../ui/theme'

const hours = Array.from({ length: 24 }, (_, h) => ({ value: h, label: new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric' }) }))

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  )
}

export function SettingsPage() {
  const { choice, setChoice } = useTheme()
  const { data: settings, isLoading } = useSettings()
  const update = useUpdateSettings()
  const [goal, setGoal] = useState<string>('')
  const [pushBusy, setPushBusy] = useState(false)
  const [pendingImport, setPendingImport] = useState<File | null>(null)

  const remindersAvailable = !!settings?.vapidPublicKey && pushSupported()

  const saveGoal = () => {
    const value = Number(goal)
    if (!Number.isInteger(value) || value < 1 || value > 1000) return toast.error('Pick a goal between 1 and 1000 reviews.')
    update.mutate({ dailyGoal: value }, { onSuccess: () => toast.success('Daily goal saved'), onError: () => toast.error('Could not save') })
  }

  const toggleReminders = async (on: boolean) => {
    if (!settings?.vapidPublicKey) return
    setPushBusy(true)
    try {
      if (on) {
        await enablePush(settings.vapidPublicKey)
        update.mutate({ reminderHour: settings.reminderHour ?? 9, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
        toast.success('Reminders on')
      } else {
        await disablePush()
        update.mutate({ reminderHour: null })
        toast.success('Reminders off')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change reminders')
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      <Section title="Appearance">
        <Segmented
          label="Theme"
          value={choice}
          onChange={setChoice}
          options={[
            { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor className="h-4 w-4" />System</span> },
            { value: 'light', label: <span className="flex items-center gap-1.5"><Sun className="h-4 w-4" />Light</span> },
            { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon className="h-4 w-4" />Dark</span> },
          ]}
        />
      </Section>

      <Section title="Daily goal" description="How many reviews you aim for each day. The ring on your dashboard fills as you go.">
        {isLoading ? <Skeleton className="h-10 w-48" /> : (
          <div className="flex items-end gap-3">
            <div className="w-32">
              <Field label="Reviews per day">
                {(id) => <Input id={id} type="number" min={1} max={1000} inputMode="numeric" value={goal || settings?.dailyGoal || ''} onChange={(e) => setGoal(e.target.value)} />}
              </Field>
            </div>
            <Button onClick={saveGoal} loading={update.isPending} disabled={!goal || Number(goal) === settings?.dailyGoal}>Save</Button>
          </div>
        )}
      </Section>

      <Section title="Reminders" description="A notification when words are due, sent once a day at the time you choose.">
        {isLoading ? <Skeleton className="h-10 w-full" /> : !remindersAvailable ? (
          <p className="text-sm text-muted">
            {!pushSupported() ? 'This browser does not support notifications. On iPhone, add Memoriser to your Home Screen first.' : 'Reminders are not enabled on this server yet.'}
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Button variant={settings!.pushEnabled ? 'secondary' : 'primary'} loading={pushBusy} onClick={() => toggleReminders(!settings!.pushEnabled)}>
              <Bell className="h-4 w-4" /> {settings!.pushEnabled ? 'Turn off reminders' : 'Turn on reminders'}
            </Button>
            {settings!.pushEnabled && (
              <div className="w-40">
                <Field label="Remind me at">
                  {(id) => (
                    <Select id={id} value={settings!.reminderHour ?? 9} onChange={(e) => update.mutate({ reminderHour: Number(e.target.value), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
                      {hours.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </Select>
                  )}
                </Field>
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Your data" description="Export everything as a backup file, or restore one. Restoring replaces your current data.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}><Download className="h-4 w-4" /> Export backup</Button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-danger-soft px-4 text-sm font-semibold text-danger transition hover:brightness-95 focus-within:outline focus-within:outline-2 focus-within:outline-accent">
            <Upload className="h-4 w-4" /> Restore backup
            <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { setPendingImport(e.target.files?.[0] ?? null); e.target.value = '' }} />
          </label>
        </div>
      </Section>

      <Section title="Account">
        <Button variant="secondary" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button>
      </Section>

      <ConfirmDialog
        open={!!pendingImport}
        title="Replace your data?"
        message="Restoring this backup wipes your current words, collections and progress and replaces them with the backup. This cannot be undone."
        confirmLabel="Replace my data"
        onClose={() => setPendingImport(null)}
        onConfirm={() => { if (pendingImport) importData(pendingImport); setPendingImport(null) }}
      />
    </div>
  )
}
