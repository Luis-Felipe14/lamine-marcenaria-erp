import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupFavicon } from '@/lib/setup-favicon'
import './index.css'
import App from './App.tsx'

setupFavicon()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
