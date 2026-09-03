import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Dashboard } from '../../features/learning/Dashboard'
import { FlashcardSession } from '../../features/learning/FlashcardSession'
import { VocabularyManager } from '../../features/vocabulary/VocabularyManager'
import { WordDetailView } from '../../features/vocabulary/WordDetailView'
import { CollectionsManager } from '../../features/collections/CollectionsManager'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Dashboard />,
  },
  {
    path: '/session',
    element: <FlashcardSession />,
  },
  {
    path: '/vocabulary',
    element: <VocabularyManager />,
  },
  {
    path: '/vocabulary/:id',
    element: <WordDetailView />,
  },
  {
    path: '/collections',
    element: <CollectionsManager />,
  }
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
