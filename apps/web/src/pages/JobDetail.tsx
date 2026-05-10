import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { useToast } from '@/components/Toast'
import {
  getJob,
  getApplications,
  applyToJob,
  selectMaster,
  completeJob,
  postReview,
  deleteJob,
} from '@/lib/api'
import { formatDate, formatBudget, cn } from '@/lib/utils'
import { ArrowLeft, Star, Trash2 } from 'lucide-react'

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)}>
          <Star
            className={cn('w-6 h-6', n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted')}
          />
        </button>
      ))}
    </div>
  )
}

function decodeUserId(token: string): string | null {
  try {
    return (JSON.parse(atob(token.split('.')[1])) as { userId: string }).userId
  } catch {
    return null
  }
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useT()
  const qc = useQueryClient()
  const { activeRole, isMaster: storeIsMaster, language, token, setActiveRole } = useStore()
  const showToast = useToast((s) => s.show)
  const userId = token ? decodeUserId(token) : null

  const [applyComment, setApplyComment] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSent, setReviewSent] = useState(false)
  const [masterPhone, setMasterPhone] = useState<string | null>(null)

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  })

  const isCustomer = !!job && job.customerId === userId
  const isMaster = !!job && job.selectedMasterId === userId

  // Auto-switch to master role when viewing a foreign job and user is registered as a master
  useEffect(() => {
    if (job && !isCustomer && storeIsMaster && activeRole !== 'master') {
      setActiveRole('master')
    }
  }, [job, isCustomer, storeIsMaster])

  const { data: applications = [] } = useQuery({
    queryKey: ['applications', id],
    queryFn: () => getApplications(id!),
    enabled: !!id && isCustomer && job?.status === 'new',
  })

  const applyMut = useMutation({
    mutationFn: () => applyToJob(id!, applyComment || undefined),
    onSuccess: () => {
      setApplyComment('')
      void qc.invalidateQueries({ queryKey: ['job', id] })
      showToast(t.job.applied, 'success')
    },
    onError: () => showToast(t.errors.generic, 'error'),
  })

  const selectMut = useMutation({
    mutationFn: (masterId: string) => selectMaster(id!, masterId),
    onSuccess: (data) => {
      setMasterPhone(data.phone)
      void qc.invalidateQueries({ queryKey: ['job', id] })
    },
  })

  const completeMut = useMutation({
    mutationFn: () => completeJob(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['job', id] })
      void qc.invalidateQueries({ queryKey: ['jobs', 'my'] })
      void qc.invalidateQueries({ queryKey: ['jobs', 'assigned'] })
    },
    onError: () => showToast(t.errors.generic, 'error'),
  })

  const reviewMut = useMutation({
    mutationFn: () => postReview(id!, { rating, comment: reviewComment || undefined }),
    onSuccess: () => setReviewSent(true),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteJob(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['jobs', 'my'] })
      navigate('/home')
    },
    onError: () => showToast(t.errors.generic, 'error'),
  })

  const handleDelete = () => {
    const confirmText =
      language === 'hy'
        ? 'Ջնջե՞լ պատվերը։ Այս գործողությունը հնարավոր չէ հետ բերել։'
        : language === 'en'
        ? 'Delete this job? This cannot be undone.'
        : 'Удалить заказ? Действие нельзя отменить.'
    if (window.confirm(confirmText)) deleteMut.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4 bg-background text-center">
        <p className="text-sm text-muted">
          {error ? 'Не удалось загрузить заказ' : 'Заказ не найден'}
        </p>
        <button
          onClick={() => navigate('/home')}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          На главную
        </button>
      </div>
    )
  }

  const alreadyApplied = job.hasApplied || applications.some((a) => a.master.id === userId)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-secondary">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="flex-1 min-w-0 font-semibold line-clamp-1">
          {categoryName(job.category, language)}
        </span>
        {isCustomer && job.status === 'new' && (
          <button
            onClick={handleDelete}
            disabled={deleteMut.isPending}
            aria-label="Delete"
            className="text-rose-500 disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </header>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm">{job.description}</p>
          <p className="text-sm text-muted">
            {t.job.budget}: {formatBudget(job.budget)}
          </p>
          <p className="text-sm text-muted">
            {t.job.dates}: {formatDate(job.dateFrom, language)}
          </p>
        </div>

        {((isCustomer && job.masterPhone) || (isMaster && job.customerPhone)) && (() => {
          const phone = isCustomer ? job.masterPhone! : job.customerPhone!
          const name = isCustomer ? job.masterName : job.customerName
          const username = isCustomer ? job.masterUsername : job.customerUsername
          const tgUrl = username ? `https://t.me/${username}` : null
          const tg = window.Telegram?.WebApp
          const cleanPhone = phone.replace(/[^+\d]/g, '')
          const openTg = () => {
            if (!tgUrl) return
            if (tg?.openTelegramLink) tg.openTelegramLink(tgUrl)
            else window.open(tgUrl, '_blank')
          }
          const openCall = () => {
            const url = `tel:${cleanPhone}`
            if (tg?.openLink) tg.openLink(url)
            else window.location.href = url
          }
          return (
            <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 flex flex-col gap-3">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">
                  {isCustomer ? 'Мастер' : 'Заказчик'}
                </p>
                <p className="font-semibold mt-1">{name}</p>
              </div>
              <button
                onClick={openCall}
                className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium"
              >
                📞 {phone}
              </button>
              {tgUrl && (
                <button
                  onClick={openTg}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-primary text-primary font-medium"
                >
                  💬 Написать в Telegram
                </button>
              )}
            </div>
          )
        })()}

        {(isCustomer || isMaster) &&
          (job.status === 'in_progress' || job.status === 'pending_confirmation') &&
          (() => {
            const myConfirmed = isMaster ? job.masterConfirmed : job.customerConfirmed
            if (myConfirmed) {
              return (
                <div className="w-full py-3 rounded-xl bg-secondary text-center text-sm text-muted">
                  {isMaster ? t.job.waitingCustomer : t.job.waitingMaster}
                </div>
              )
            }
            return (
              <button
                onClick={() => completeMut.mutate()}
                disabled={completeMut.isPending}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                {completeMut.isPending ? '...' : t.job.markDone}
              </button>
            )
          })()}

        {isCustomer && job.status === 'new' && applications.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold">
              {t.job.applications} ({applications.length})
            </h2>
            {applications.map((app) => (
              <div
                key={app.id}
                onClick={() => navigate(`/masters/${app.master.id}`)}
                className="p-3 bg-secondary rounded-xl flex flex-col gap-2 cursor-pointer active:opacity-70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{app.master.name}</p>
                    {typeof app.master.rating === 'number' ? (
                      <p className="text-xs text-muted mt-0.5">
                        ⭐ {app.master.rating.toFixed(1)} · {app.master.reviewCount ?? 0} {t.masters.reviews}
                      </p>
                    ) : (
                      <p className="text-xs text-muted mt-0.5">{t.masters.noReviews}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      selectMut.mutate(app.master.id)
                    }}
                    disabled={selectMut.isPending}
                    className="flex-shrink-0 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
                  >
                    {t.job.selectMaster}
                  </button>
                </div>
                {app.comment && <p className="text-sm text-muted">{app.comment}</p>}
              </div>
            ))}
          </div>
        )}

        {isCustomer && job.status === 'completed' && !reviewSent && (
          <div className="flex flex-col gap-3 p-4 bg-secondary rounded-xl">
            <h2 className="font-semibold">{t.job.reviewTitle}</h2>
            <StarInput value={rating} onChange={setRating} />
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={t.job.reviewComment}
              rows={3}
              className="w-full p-3 rounded-xl bg-background outline-none resize-none text-base"
            />
            <button
              onClick={() => reviewMut.mutate()}
              disabled={reviewMut.isPending}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {t.job.submitReview}
            </button>
          </div>
        )}

        {!isCustomer && !isMaster && job.status === 'new' && activeRole === 'master' && (
          <div className="flex flex-col gap-3">
            <textarea
              value={applyComment}
              onChange={(e) => setApplyComment(e.target.value)}
              placeholder={t.job.commentPlaceholder}
              rows={3}
              className="w-full p-3 rounded-xl bg-secondary outline-none resize-none text-base"
            />
            <button
              onClick={() => applyMut.mutate()}
              disabled={alreadyApplied || applyMut.isPending}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {alreadyApplied ? t.job.applied : t.job.apply}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
