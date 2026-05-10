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

const applySafeArea = () => {
  const inset = (tg as unknown as { safeAreaInset?: { top: number; bottom: number } } | undefined)
    ?.safeAreaInset
  if (inset) {
    document.documentElement.style.setProperty('--safe-top', `${inset.top}px`)
    document.documentElement.style.setProperty('--safe-bottom', `${inset.bottom}px`)
  }
}
applySafeArea()
tg?.onEvent('safeAreaChanged', applySafeArea)
tg?.onEvent('contentSafeAreaChanged', applySafeArea)

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
