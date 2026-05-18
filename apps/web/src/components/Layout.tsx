import type { ReactNode } from 'react'
import { Toast } from '@/components/Toast'
import { BottomNav } from '@/components/BottomNav'

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Toast />
      <div
        className="min-h-screen bg-background text-foreground"
        style={{ paddingBottom: 'calc(var(--safe-bottom, 0px) + 4rem)' }}
      >
        <header
          className="sticky top-0 z-10 bg-background border-b border-secondary px-4 py-3"
          style={{ paddingTop: 'var(--header-top, 12px)' }}
        >
          <h1 className="text-lg font-bold">{title}</h1>
        </header>
        <main className="p-4">{children}</main>
      </div>
      <BottomNav />
    </>
  )
}
