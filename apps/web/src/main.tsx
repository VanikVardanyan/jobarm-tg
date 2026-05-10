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
tg?.requestFullscreen?.()

const setVh = () => {
  const h = tg?.viewportStableHeight ?? tg?.viewportHeight ?? window.innerHeight
  document.documentElement.style.setProperty('--app-height', `${h}px`)
}
setVh()
tg?.onEvent('viewportChanged', setVh)
window.addEventListener('resize', setVh)

type Inset = { top: number; bottom: number; left?: number; right?: number }
type ExtTg = {
  safeAreaInset?: Inset
  contentSafeAreaInset?: Inset
  isFullscreen?: boolean
}

const applySafeArea = () => {
  const ext = tg as unknown as ExtTg | undefined
  const safe = ext?.safeAreaInset
  const content = ext?.contentSafeAreaInset
  const top = (safe?.top ?? 0) + (content?.top ?? 0)
  const bottom = (safe?.bottom ?? 0) + (content?.bottom ?? 0)
  // Always reserve at least 24px on top so the Telegram header / status bar doesn't overlap content
  const minTop = ext?.isFullscreen ? 56 : 24
  document.documentElement.style.setProperty('--safe-top', `${Math.max(top, minTop)}px`)
  document.documentElement.style.setProperty('--safe-bottom', `${bottom}px`)
}
applySafeArea()
tg?.onEvent('safeAreaChanged', applySafeArea)
tg?.onEvent('contentSafeAreaChanged', applySafeArea)
tg?.onEvent('fullscreenChanged', applySafeArea)

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
