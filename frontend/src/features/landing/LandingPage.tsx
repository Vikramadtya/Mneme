import { GoogleLogin } from '@react-oauth/google';
import { BarChart3, BookOpen, Brain, Flame, Layers, Repeat, Share2, Sparkles } from 'lucide-react';
import { useGoogleSignIn } from '../auth/useGoogleSignIn';
import { Card } from '../../ui';
import { ThemeToggle } from '../../ui/ThemeToggle';

const FEATURES = [
  { icon: Repeat, title: 'Spaced repetition that adapts', body: 'Memoriser schedules each word with FSRS, a modern memory model, so you review it just before you would forget it.' },
  { icon: BookOpen, title: 'Words fill themselves in', body: 'Type a word and get definitions, examples, synonyms and a recorded pronunciation. Paste a whole list to add hundreds at once.' },
  { icon: Layers, title: 'Collections you can share', body: 'Group words into lists for an exam or a trip, then share a list with a single link.' },
  { icon: Flame, title: 'Streaks and daily goals', body: 'A calendar of your reviews, a streak to protect and reminders that nudge you at the time you choose.' },
  { icon: Brain, title: 'Four ways to practise', body: 'Flip cards, reverse them, type the answer, or fill in the blank, with keyboard shortcuts and swipe gestures.' },
  { icon: BarChart3, title: 'Works offline', body: 'Install it on your phone. Reviews made without a connection are saved and synced when you are back.' },
];

export function LandingPage() {
  const signIn = useGoogleSignIn();

  return (
    <div className="min-h-screen overflow-hidden bg-bg text-fg">
      <nav className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img src="/brain-svgrepo-com.svg" alt="" className="h-9 w-9" />
          <span className="text-xl font-extrabold tracking-tight">Memoriser</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <GoogleLogin onSuccess={signIn.onSuccess} onError={signIn.onError} shape="pill" text="signin_with" />
        </div>
      </nav>

      <header className="relative px-6 pb-20 pt-16 lg:pb-32 lg:pt-28">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 opacity-40 dark:opacity-30">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-sky-400 blur-[110px]" />
          <div className="absolute left-24 top-16 h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-fuchsia-400 to-rose-300 blur-[120px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-1.5 text-sm font-semibold text-accent backdrop-blur">
            <Sparkles className="h-4 w-4" /> Vocabulary that sticks
          </p>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Never forget a <span className="bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">word again.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
            Build a personal vocabulary, review it with a scheduler that learns how you remember, and watch the streak grow.
          </p>
          <div className="mt-10 flex justify-center">
            <GoogleLogin onSuccess={signIn.onSuccess} onError={signIn.onError} size="large" theme="filled_black" shape="pill" text="continue_with" />
          </div>
          <p className="mt-4 text-sm text-muted">Sign in with Google. There is no password to remember.</p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight">Built for remembering.</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="group p-7 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:scale-110">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{title}</h3>
              <p className="leading-relaxed text-muted">{body}</p>
            </Card>
          ))}
        </div>
        <p className="mt-10 flex items-center justify-center gap-2 text-sm text-muted"><Share2 className="h-4 w-4" /> Got a link to a shared collection? Open it, then sign in to add it to your library.</p>
      </section>

      <footer className="border-t border-line py-10 text-center text-sm text-muted">
        <div className="mb-3 flex items-center justify-center gap-2 opacity-70">
          <img src="/brain-svgrepo-com.svg" alt="" className="h-5 w-5" />
          <span className="font-bold uppercase tracking-wider">Memoriser</span>
        </div>
        <p>© {new Date().getFullYear()} Memoriser. Learn faster, remember longer.</p>
      </footer>
    </div>
  );
}
