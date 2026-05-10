import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Search, ShieldCheck, ShieldOff, Crown } from 'lucide-react'
import { getAdminUsers } from '@/lib/api'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'

export default function Admin() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: () => getAdminUsers(q),
  })

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 pb-4 border-b border-secondary tma-safe-top">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">Админка</span>
      </header>

      <div className="p-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: имя, телефон, @username, Telegram ID"
            className="w-full pl-9 pr-3 py-3 rounded-xl bg-secondary outline-none text-base"
          />
        </div>

        {isLoading && <div className="text-center text-muted py-8">...</div>}
        {!isLoading && users.length === 0 && (
          <p className="text-center text-muted py-8">Никого не найдено</p>
        )}

        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => navigate(`/admin/${u.id}`)}
              className={cn(
                'w-full text-left p-3 rounded-xl bg-secondary flex items-center gap-3',
                u.isBanned && 'opacity-50'
              )}
            >
              <Avatar url={u.avatarUrl} name={u.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium truncate">{u.name}</p>
                  {u.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                  {u.isBanned && <ShieldOff className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                  {u.isMaster && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted truncate">
                  {u.username ? `@${u.username}` : `tg ${u.telegramId}`}
                  {' · '}
                  {u._count.jobsAsCustomer} заказ · {u._count.applications} откликов
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
