import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { SERVICE_TYPES, REQUEST_STATUS_LABELS, localizedLabel } from '@jobbarm/shared'
import { getRequests } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Layout } from '@/components/Layout'

export default function RequestsPage() {
  const t = useT()
  const lang = useStore((s) => s.language)
  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: getRequests,
  })

  return (
    <Layout title={t.requests.title}>
      {isLoading && <p className="text-muted">…</p>}
      {error && <p className="text-rose-500">{t.errors.generic}</p>}
      {requests && requests.length === 0 && <p className="text-muted">{t.requests.empty}</p>}
      <div className="flex flex-col gap-2">
        {requests?.map((r) => {
          const svc = SERVICE_TYPES.find((s) => s.key === r.serviceType)
          return (
            <Link
              key={r.id}
              to={`/requests/${r.id}`}
              className="rounded-lg bg-secondary p-3 block"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {svc ? localizedLabel(svc.label, lang) : r.serviceType}
                </span>
                <span className="text-xs text-muted">
                  {localizedLabel(REQUEST_STATUS_LABELS[r.status], lang)}
                </span>
              </div>
              <div className="text-sm text-muted mt-1">
                {r.car.make} {r.car.model} {r.car.year}
              </div>
              <div className="text-sm mt-1 line-clamp-2">{r.description}</div>
              <div className="text-xs text-muted mt-1 flex gap-3">
                {r.photosCount > 0 && <span>{t.requests.photos.replace('{n}', String(r.photosCount))}</span>}
                {r.hasVoice && <span>{t.requests.voice}</span>}
              </div>
            </Link>
          )
        })}
      </div>
    </Layout>
  )
}
