import { NavLink } from 'react-router-dom'
import { Home, Users, Bell, User } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/home', icon: Home, key: 'home' as const },
  { to: '/masters', icon: Users, key: 'masters' as const },
  { to: '/notifications', icon: Bell, key: 'notifications' as const },
  { to: '/profile', icon: User, key: 'profile' as const },
]

export default function BottomNav() {
  const t = useT()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-secondary flex h-16">
      {tabs.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors',
              isActive ? 'text-primary' : 'text-muted'
            )
          }
        >
          <Icon className="w-5 h-5" />
          <span>{t.tabs[key]}</span>
        </NavLink>
      ))}
    </nav>
  )
}
