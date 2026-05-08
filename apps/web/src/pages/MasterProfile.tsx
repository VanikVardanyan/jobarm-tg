import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT } from '@/lib/i18n'
import { getMaster } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import { ArrowLeft, Star } from 'lucide-react'

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'w-4 h-4',
            n <= Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
          )}
        />
      ))}
    </div>
  )
}

export default function MasterProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t = useT()
  const language = useStore((s) => s.language)

  const { data: master, isLoading } = useQuery({
    queryKey: ['master', id],
    queryFn: () => getMaster(id!),
    enabled: !!id,
  })

  if (isLoading || !master) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 p-4 border-b border-secondary">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">{master.name}</span>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-6">
        {master.rating !== null ? (
          <div className="flex items-center gap-3">
            <StarDisplay value={master.rating} />
            <span className="font-semibold">{master.rating.toFixed(1)}</span>
            <span className="text-sm text-muted">
              {master.reviewCount} {t.masters.reviews}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted">{t.masters.noReviews}</span>
        )}

        <div className="flex flex-wrap gap-2">
          {master.categories.map((cat) => (
            <span key={cat.id} className="px-3 py-1 rounded-full bg-secondary text-sm">
              {language === 'en' ? cat.nameEn : cat.nameRu}
            </span>
          ))}
        </div>

        {master.reviews.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-semibold">Отзывы</h2>
            {master.reviews.map((review) => (
              <div key={review.id} className="p-3 bg-secondary rounded-xl flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{review.customer.name}</span>
                  <StarDisplay value={review.rating} />
                </div>
                {review.comment && <p className="text-sm text-muted">{review.comment}</p>}
                <span className="text-xs text-muted">
                  {formatDate(review.createdAt, language)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
