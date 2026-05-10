import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Home, Users, Bell, User } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { getNotifications } from '@/lib/api'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/home', icon: Home, key: 'home' as const },
  { to: '/masters', icon: Users, key: 'masters' as const },
  { to: '/notifications', icon: Bell, key: 'notifications' as const },
  { to: '/profile', icon: User, key: 'profile' as const },
]

export default function BottomNav() {
  const t = useT()
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications })
  const unread = data?.unread ?? 0
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-secondary flex h-16 pb-2">
      {tabs.map(({ to, icon: Icon, key }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors relative',
              isActive ? 'text-primary' : 'text-muted'
            )
          }
        >
          <div className="relative">
            <Icon className="w-5 h-5" />
            {key === 'notifications' && unread > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-semibold flex items-center justify-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
          <span>{t.tabs[key]}</span>
        </NavLink>
      ))}
    </nav>
  )
}
