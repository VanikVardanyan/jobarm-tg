import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api'
import { cn } from '@/lib/utils'

const ICONS: Record<string, string> = {
  new_job: '🔔',
  new_application: '👨‍🔧',
  master_selected: '✅',
  master_marked_done: '🏁',
  job_completed: '🎉',
  new_review: '⭐',
}

function formatRelative(iso: string, lang: string): string {
  const date = new Date(iso)
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return lang === 'hy' ? 'հենց հիմա' : lang === 'en' ? 'just now' : 'только что'
  if (min < 60)
    return lang === 'hy' ? `${min} րոպե առաջ` : lang === 'en' ? `${min}m ago` : `${min} мин назад`
  const hours = Math.floor(min / 60)
  if (hours < 24)
    return lang === 'hy' ? `${hours} ժամ առաջ` : lang === 'en' ? `${hours}h ago` : `${hours} ч назад`
  return date.toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : 'hy-AM', {
    day: 'numeric',
    month: 'short',
  })
}

export default function Notifications() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const language = useStore((s) => s.language)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const items = data?.items ?? []
  const unread = data?.unread ?? 0

  const open = (id: string, jobId: string | null) => {
    if (!data?.items.find((n) => n.id === id)?.read) markRead.mutate(id)
    if (jobId) navigate(`/jobs/${jobId}`)
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.notifications.title}</h1>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="text-xs text-primary font-medium"
          >
            <Check className="w-4 h-4 inline mr-1" />
            {language === 'hy' ? 'Ամենը' : language === 'en' ? 'Mark all' : 'Прочитать все'}
          </button>
        )}
      </div>

      {isLoading && <div className="text-center text-muted py-8">...</div>}

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Bell className="w-12 h-12 text-muted" />
          <p className="text-sm text-muted text-center">
            {language === 'hy'
              ? 'Ծանուցումներ չկան'
              : language === 'en'
              ? 'No notifications'
              : 'Уведомлений нет'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => open(n.id, n.jobId)}
            className={cn(
              'w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors',
              n.read ? 'bg-secondary/50' : 'bg-primary/10 border border-primary/30'
            )}
          >
            <span className="text-2xl flex-shrink-0">{ICONS[n.kind] ?? '🔔'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={cn('text-sm font-medium', !n.read && 'text-primary')}>{n.title}</p>
                <span className="text-xs text-muted flex-shrink-0">
                  {formatRelative(n.createdAt, language)}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
