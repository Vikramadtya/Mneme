import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Dashboard } from '../../features/learning/Dashboard'
import { FlashcardSession } from '../../features/learning/FlashcardSession'
import { VocabularyManager } from '../../features/vocabulary/VocabularyManager'
import { WordDetailView } from '../../features/vocabulary/WordDetailView'
import { CollectionsManager } from '../../features/collections/CollectionsManager'
import { LandingPage } from '../../features/landing/LandingPage'
import { useState, useEffect } from 'react'

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      // Mock auth check
      const authState = localStorage.getItem('isAuthenticated');
      setIsAuthenticated(authState === 'true');
      setIsLoading(false);
  }, []);

  if (isLoading) return null;

  if (!isAuthenticated) {
      return <LandingPage />
  }

  return <RouterProvider router={router} />
}
