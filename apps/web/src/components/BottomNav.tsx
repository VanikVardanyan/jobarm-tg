import { NavLink } from 'react-router-dom'
import { useT } from '@/lib/i18n'

const tabs = [
  { to: '/requests', icon: '📋', key: 'requests' as const },
  { to: '/cars', icon: '🚗', key: 'garage' as const },
  { to: '/profile', icon: '⚙️', key: 'profile' as const },
]

export function BottomNav() {
  const t = useT()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-secondary bg-background"
      style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${
              isActive ? 'text-primary' : 'text-muted'
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{t.nav[tab.key]}</span>
        </NavLink>
      ))}
    </nav>
  )
}
