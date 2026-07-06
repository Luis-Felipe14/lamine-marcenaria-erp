import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerPwa } from '@/lib/register-pwa'
import { setupFavicon } from '@/lib/setup-favicon'
import './index.css'
import App from './App.tsx'

setupFavicon()
registerPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
