import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { isSignedIn } from '../../api/auth'
import { LandingPage } from '../../features/landing/LandingPage'
import { AppShell } from '../layout/AppShell'
import { PageSkeleton } from '../layout/PageSkeleton'

// Each page is fetched on demand so the first load only ships what is needed.
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) => ({
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
})

const router = createBrowserRouter([
  {
    element: <AppShell />,
    hydrateFallbackElement: <PageSkeleton />,
    children: [
      { path: '/', ...page(() => import('../../features/learning/Dashboard'), 'Dashboard') },
      { path: '/vocabulary', ...page(() => import('../../features/vocabulary/VocabularyManager'), 'VocabularyManager') },
      { path: '/collections', ...page(() => import('../../features/collections/CollectionsManager'), 'CollectionsManager') },
      { path: '/insights', ...page(() => import('../../features/insights/Insights'), 'Insights') },
      { path: '/settings', ...page(() => import('../../features/settings/SettingsPage'), 'SettingsPage') },
    ],
  },
  { path: '/session', ...page(() => import('../../features/learning/FlashcardSession'), 'FlashcardSession') },
  { path: '/vocabulary/:id', ...page(() => import('../../features/vocabulary/WordDetailView'), 'WordDetailView') },
  { path: '/s/:shareId', ...page(() => import('../../features/share/SharedCollectionPage'), 'SharedCollectionPage') },
])

export function AppRouter() {
  // A shared collection can be opened without an account.
  if (!isSignedIn() && !location.pathname.startsWith('/s/')) return <LandingPage />
  return <RouterProvider router={router} />
}
