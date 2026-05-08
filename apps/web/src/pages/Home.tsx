import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT } from '@/lib/i18n'
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
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm line-clamp-1">{job.category.nameRu}</span>
        <StatusBadge status={job.status} />
      </div>
      <p className="text-sm text-muted line-clamp-2">{job.description}</p>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{formatBudget(job.budget)}</span>
        <span>
          {formatDate(job.dateFrom, lang)} – {formatDate(job.dateTo, lang)}
        </span>
      </div>
    </button>
  )
}

function CustomerHome() {
  const t = useT()
  const navigate = useNavigate()
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'my'],
    queryFn: getMyJobs,
  })
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.home.customerTitle}</h1>
        <button
          onClick={() => navigate('/jobs/new')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t.home.createJob}
        </button>
      </div>
      {isLoading && <div className="text-center text-muted py-8">...</div>}
      {!isLoading && jobs.length === 0 && (
        <p className="text-center text-muted py-8">{t.home.noJobs}</p>
      )}
      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}

function MasterHome() {
  const t = useT()
  const [tab, setTab] = useState<'feed' | 'assigned'>('feed')

  const { data: feed = [], isLoading: loadingFeed } = useQuery({
    queryKey: ['jobs', 'feed'],
    queryFn: getJobFeed,
    enabled: tab === 'feed',
  })
  const { data: assigned = [], isLoading: loadingAssigned } = useQuery({
    queryKey: ['jobs', 'assigned'],
    queryFn: getAssignedJobs,
    enabled: tab === 'assigned',
  })

  const jobs = tab === 'feed' ? feed : assigned
  const isLoading = tab === 'feed' ? loadingFeed : loadingAssigned

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex rounded-xl overflow-hidden border border-secondary">
        <button
          onClick={() => setTab('feed')}
          className={cn(
            'flex-1 py-2 text-sm font-medium transition-colors',
            tab === 'feed' ? 'bg-primary text-primary-foreground' : ''
          )}
        >
          {t.home.masterFeedTitle}
        </button>
        <button
          onClick={() => setTab('assigned')}
          className={cn(
            'flex-1 py-2 text-sm font-medium transition-colors',
            tab === 'assigned' ? 'bg-primary text-primary-foreground' : ''
          )}
        >
          {t.home.masterAssignedTitle}
        </button>
      </div>
      {isLoading && <div className="text-center text-muted py-8">...</div>}
      {!isLoading && jobs.length === 0 && (
        <p className="text-center text-muted py-8">{t.home.noFeed}</p>
      )}
      <div className="flex flex-col gap-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const activeRole = useStore((s) => s.activeRole)
  return activeRole === 'customer' ? <CustomerHome /> : <MasterHome />
}
