import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { getMyJobs, getJobFeed, getAssignedJobs } from '@/lib/api'
import { formatDate, formatBudget, cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { Job } from '@jobbarm/shared'

function StatusBadge({ status }: { status: Job['status'] }) {
  const t = useT()
  const colors: Record<Job['status'], string> = {
    new: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    pending_confirmation: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', colors[status])}>
      {t.home.status[status]}
    </span>
  )
}

function JobCard({ job }: { job: Job }) {
  const lang = useStore((s) => s.language)
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="w-full text-left p-4 rounded-xl bg-secondary flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 min-w-0 font-medium text-sm line-clamp-1">{categoryName(job.category, lang)}</span>
        <span className="flex-shrink-0">
          <StatusBadge status={job.status} />
        </span>
      </div>
      <p className="text-sm text-muted line-clamp-2">{job.description}</p>
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-medium text-primary">{formatBudget(job.budget)}</span>
        <span>{formatDate(job.dateFrom, lang)}</span>
      </div>
      {job.applicationCount > 0 && job.status === 'new' && (
        <div className="flex items-center gap-1.5 mt-1">
          <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            {job.applicationCount} {job.applicationCount === 1 ? 'отклик' : 'откликов'}
          </span>
        </div>
      )}
    </button>
  )
}

type Tab = 'orders' | 'feed' | 'assigned'

function NewJobButton() {
  const t = useT()
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/jobs/new')}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
    >
      <Plus className="w-4 h-4" />
      {t.home.createJob}
    </button>
  )
}

function OrdersTab() {
  const t = useT()
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'my'],
    queryFn: getMyJobs,
  })
  return (
    <>
      {isLoading && <div className="text-center text-muted py-8">...</div>}
      {!isLoading && jobs.length === 0 && (
        <p className="text-center text-muted py-8">{t.home.noJobs}</p>
      )}
      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </>
  )
}

function FeedTab() {
  const t = useT()
  const { data: feed = [], isLoading } = useQuery({
    queryKey: ['jobs', 'feed'],
    queryFn: getJobFeed,
  })
  return (
    <>
      {isLoading && <div className="text-center text-muted py-8">...</div>}
      {!isLoading && feed.length === 0 && (
        <p className="text-center text-muted py-8">{t.home.noFeed}</p>
      )}
      <div className="flex flex-col gap-3">
        {feed.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </>
  )
}

function AssignedTab() {
  const t = useT()
  const { data: assigned = [], isLoading } = useQuery({
    queryKey: ['jobs', 'assigned'],
    queryFn: getAssignedJobs,
  })
  return (
    <>
      {isLoading && <div className="text-center text-muted py-8">...</div>}
      {!isLoading && assigned.length === 0 && (
        <p className="text-center text-muted py-8">{t.home.noJobs}</p>
      )}
      <div className="flex flex-col gap-3">
        {assigned.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </>
  )
}

export default function Home() {
  const t = useT()
  const isMaster = useStore((s) => s.isMaster)
  const [tab, setTab] = useState<Tab>('orders')

  // Customer only — single screen with own orders + create button
  if (!isMaster) {
    return (
      <div className="px-4 pb-4 flex flex-col gap-4 tma-safe-top">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{t.home.customerTitle}</h1>
          <NewJobButton />
        </div>
        <OrdersTab />
      </div>
    )
  }

  return (
    <div className="px-4 pb-4 flex flex-col gap-4 tma-safe-top">
      <div className="flex items-center justify-end">
        <NewJobButton />
      </div>
      <div className="flex rounded-xl overflow-hidden border border-secondary">
        <button
          onClick={() => setTab('orders')}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            tab === 'orders' ? 'bg-primary text-primary-foreground' : ''
          )}
        >
          {t.home.customerTitle}
        </button>
        <button
          onClick={() => setTab('feed')}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            tab === 'feed' ? 'bg-primary text-primary-foreground' : ''
          )}
        >
          {t.home.masterFeedTitle}
        </button>
        <button
          onClick={() => setTab('assigned')}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            tab === 'assigned' ? 'bg-primary text-primary-foreground' : ''
          )}
        >
          {t.home.masterAssignedTitle}
        </button>
      </div>
      {tab === 'orders' && <OrdersTab />}
      {tab === 'feed' && <FeedTab />}
      {tab === 'assigned' && <AssignedTab />}
    </div>
  )
}
