import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Phone, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react'
import { getAdminUser, banAdminUser, deleteAdminUser } from '@/lib/api'
import { Avatar } from '@/components/Avatar'
import { useToast } from '@/components/Toast'
import { formatBudget, formatDate } from '@/lib/utils'

export default function AdminUser() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const showToast = useToast((s) => s.show)

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => getAdminUser(id!),
    enabled: !!id,
  })

  const banMut = useMutation({
    mutationFn: () => banAdminUser(id!, !user?.isBanned),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      showToast(user?.isBanned ? 'Разблокирован' : 'Заблокирован', 'success')
    },
    onError: () => showToast('Ошибка', 'error'),
  })

  const delMut = useMutation({
    mutationFn: () => deleteAdminUser(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      showToast('Удалён', 'success')
      navigate('/admin', { replace: true })
    },
    onError: () => showToast('Ошибка', 'error'),
  })

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const onDelete = () => {
    if (window.confirm(`Удалить ${user.name} навсегда? Все его заказы и отклики тоже удалятся.`))
      delMut.mutate()
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 pb-4 border-b border-secondary tma-safe-top">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="flex-1 min-w-0 font-semibold truncate">{user.name}</span>
      </header>

      <div className="p-4 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Avatar url={user.avatarUrl} name={user.name} size={72} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">{user.name}</p>
            {user.username && <p className="text-sm text-muted">@{user.username}</p>}
            <p className="text-xs text-muted">tg {user.telegramId}</p>
            {user.phone && (
              <p className="text-sm flex items-center gap-1 mt-1">
                <Phone className="w-3.5 h-3.5" /> {user.phone}
              </p>
            )}
          </div>
        </div>

        {user.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {user.categories.map((c) => (
              <span key={c.id} className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                {c.nameRu}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => banMut.mutate()}
            disabled={banMut.isPending}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border ${
              user.isBanned
                ? 'border-emerald-500 text-emerald-600'
                : 'border-amber-500 text-amber-600'
            }`}
          >
            {user.isBanned ? (
              <>
                <ShieldCheck className="w-4 h-4 inline mr-1" /> Разблокировать
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4 inline mr-1" /> Заблокировать
              </>
            )}
          </button>
          <button
            onClick={onDelete}
            disabled={delMut.isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-rose-500 text-rose-600"
          >
            <Trash2 className="w-4 h-4 inline mr-1" /> Удалить
          </button>
        </div>

        {user.jobsAsCustomer.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
              Заказы ({user.jobsAsCustomer.length})
            </h2>
            <div className="flex flex-col gap-2">
              {user.jobsAsCustomer.map((job) => (
                <button
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="text-left p-3 bg-secondary rounded-xl"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium">{job.category.nameRu}</span>
                    <span className="text-xs text-muted">{job.status}</span>
                  </div>
                  <p className="text-xs text-muted line-clamp-1 mt-1">{job.description}</p>
                  <p className="text-xs text-primary mt-1">{formatBudget(job.budget)} · {formatDate(job.dateFrom, 'ru')}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {user.applications.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
              Отклики ({user.applications.length})
            </h2>
            <div className="flex flex-col gap-2">
              {user.applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => navigate(`/jobs/${app.jobId}`)}
                  className="text-left p-3 bg-secondary rounded-xl"
                >
                  <p className="text-sm font-medium">{app.job.category.nameRu}</p>
                  {app.comment && <p className="text-xs text-muted line-clamp-1 mt-1">{app.comment}</p>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
