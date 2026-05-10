import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { watchTheme } from './lib/theme'
import './index.css'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

const tg = window.Telegram?.WebApp
tg?.ready()
tg?.expand()

// Capture deep-link param synchronously before router boots — Telegram may put it in:
// - initDataUnsafe.start_param (direct link)
// - ?startapp= or ?tgWebAppStartParam= in URL
// - #tgWebAppStartParam= in hash
function readStartParam(): string | null {
  const fromInit = tg?.initDataUnsafe?.start_param
  if (fromInit) return fromInit
  const url = new URL(window.location.href)
  const fromQuery =
    url.searchParams.get('startapp') ||
    url.searchParams.get('tgWebAppStartParam')
  if (fromQuery) return fromQuery
  const hash = window.location.hash.replace(/^#/, '')
  if (hash) {
    const fromHash = new URLSearchParams(hash).get('tgWebAppStartParam')
    if (fromHash) return fromHash
  }
  return null
}
;(window as { __startParam?: string | null }).__startParam = readStartParam()

watchTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
