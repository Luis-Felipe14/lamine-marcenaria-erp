import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppRoutes } from '@/routes'
import { useUIStore } from '@/stores/uiStore'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(24, 24, 24, 0.96)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
