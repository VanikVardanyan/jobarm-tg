import { useT } from '@/lib/i18n'
import { Bell } from 'lucide-react'

export default function Notifications() {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
      <Bell className="w-12 h-12 text-muted" />
      <h1 className="text-lg font-semibold">{t.notifications.title}</h1>
      <p className="text-sm text-muted text-center">{t.notifications.empty}</p>
    </div>
  )
}
