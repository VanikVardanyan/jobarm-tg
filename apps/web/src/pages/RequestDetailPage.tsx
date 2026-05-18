import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  SERVICE_TYPES,
  URGENCIES,
  DISTRICTS,
  REQUEST_STATUS_LABELS,
  localizedLabel,
} from '@jobbarm/shared'
import { getRequest } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { Layout } from '@/components/Layout'

export default function RequestDetailPage() {
  const t = useT()
  const lang = useStore((s) => s.language)
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: r, isLoading, error } = useQuery({
    queryKey: ['request', id],
    queryFn: () => getRequest(id as string),
    enabled: !!id,
  })

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-2 border-b border-secondary">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )

  return (
    <Layout title={t.requests.title}>
      <button className="text-primary text-sm mb-3" onClick={() => navigate('/requests')}>
        {t.requests.back}
      </button>
      {isLoading && <p className="text-muted">…</p>}
      {error && <p className="text-rose-500">{t.requests.notFound}</p>}
      {r && (
        <div>
          {(() => {
            const svc = SERVICE_TYPES.find((s) => s.key === r.serviceType)
            const urg = URGENCIES.find((u) => u.key === r.urgency)
            const dist = DISTRICTS.find((d) => d.key === r.district)
            return (
              <>
                <Row label={t.requests.status} value={localizedLabel(REQUEST_STATUS_LABELS[r.status], lang)} />
                <Row label={t.requests.car} value={`${r.car.make} ${r.car.model} ${r.car.year}`} />
                <Row
                  label={t.requests.urgency}
                  value={urg ? localizedLabel(urg.label, lang) : r.urgency}
                />
                <Row
                  label={t.requests.district}
                  value={dist ? localizedLabel(dist.label, lang) : r.district}
                />
                <Row
                  label={t.requests.drivable}
                  value={r.isDrivable ? t.requests.drivable : t.requests.notDrivable}
                />
                <Row
                  label={t.requests.created}
                  value={new Date(r.createdAt).toLocaleDateString()}
                />
                <div className="py-3">
                  <div className="text-muted text-sm mb-1">{t.requests.description}</div>
                  <div className="whitespace-pre-wrap">{r.description}</div>
                </div>
                <div className="text-sm text-muted flex gap-3">
                  {r.photos.length > 0 && (
                    <span>{t.requests.photos.replace('{n}', String(r.photos.length))}</span>
                  )}
                  {r.voiceFileId && <span>{t.requests.voice}</span>}
                </div>
                {svc && (
                  <div className="mt-2 text-sm text-muted">
                    {localizedLabel(svc.label, lang)}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}
    </Layout>
  )
}
