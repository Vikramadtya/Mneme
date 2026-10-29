import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { isSignedIn } from '../../api/auth'
import { LandingPage } from '../../features/landing/LandingPage'

// Each page is fetched on demand so the first load only ships what is needed.
const page = <T extends Record<string, unknown>>(load: () => Promise<T>, name: keyof T) => ({
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
})

const router = createBrowserRouter([
  { path: '/', ...page(() => import('../../features/learning/Dashboard'), 'Dashboard') },
  { path: '/session', ...page(() => import('../../features/learning/FlashcardSession'), 'FlashcardSession') },
  { path: '/vocabulary', ...page(() => import('../../features/vocabulary/VocabularyManager'), 'VocabularyManager') },
  { path: '/vocabulary/:id', ...page(() => import('../../features/vocabulary/WordDetailView'), 'WordDetailView') },
  { path: '/collections', ...page(() => import('../../features/collections/CollectionsManager'), 'CollectionsManager') },
])

export function AppRouter() {
  return isSignedIn() ? <RouterProvider router={router} /> : <LandingPage />
}
