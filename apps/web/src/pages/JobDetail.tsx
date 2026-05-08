import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT } from '@/lib/i18n'
import {
  getJob,
  getApplications,
  applyToJob,
  selectMaster,
  completeJob,
  postReview,
} from '@/lib/api'
import { formatDate, formatBudget, cn } from '@/lib/utils'
import { ArrowLeft, Star } from 'lucide-react'

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
  const { activeRole, language, token } = useStore()
  const userId = token ? decodeUserId(token) : null

  const [applyComment, setApplyComment] = useState('')
  const [rating, setRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSent, setReviewSent] = useState(false)
  const [masterPhone, setMasterPhone] = useState<string | null>(null)

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJob(id!),
    enabled: !!id,
  })

  const isCustomer = !!job && job.customerId === userId
  const isMaster = !!job && job.selectedMasterId === userId

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
    },
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['job', id] }),
  })

  const reviewMut = useMutation({
    mutationFn: () => postReview(id!, { rating, comment: reviewComment || undefined }),
    onSuccess: () => setReviewSent(true),
  })

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const alreadyApplied = applications.some((a) => a.master.id === userId)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 p-4 border-b border-secondary">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold line-clamp-1">{job.category.nameRu}</span>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm">{job.description}</p>
          <p className="text-sm text-muted">
            {t.job.budget}: {formatBudget(job.budget)}
          </p>
          <p className="text-sm text-muted">
            {t.job.dates}: {formatDate(job.dateFrom, language)} – {formatDate(job.dateTo, language)}
          </p>
        </div>

        {isCustomer && masterPhone && (
          <div className="p-3 bg-green-50 rounded-xl text-sm">
            Телефон мастера: <span className="font-medium">{masterPhone}</span>
          </div>
        )}

        {(isCustomer || isMaster) &&
          (job.status === 'in_progress' || job.status === 'pending_confirmation') && (
            <button
              onClick={() => completeMut.mutate()}
              disabled={completeMut.isPending}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {t.job.markDone}
            </button>
          )}

        {isCustomer && job.status === 'new' && applications.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold">
              {t.job.applications} ({applications.length})
            </h2>
            {applications.map((app) => (
              <div key={app.id} className="p-3 bg-secondary rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/masters/${app.master.id}`)}
                    className="font-medium text-sm text-link"
                  >
                    {app.master.name}
                  </button>
                  <button
                    onClick={() => selectMut.mutate(app.master.id)}
                    disabled={selectMut.isPending}
                    className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
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
              className="w-full p-3 rounded-xl bg-background outline-none resize-none text-sm"
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
              className="w-full p-3 rounded-xl bg-secondary outline-none resize-none text-sm"
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
