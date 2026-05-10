import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { getMasters, getCategories } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

export default function Masters() {
  const t = useT()
  const navigate = useNavigate()
  const language = useStore((s) => s.language)
  const [categoryId, setCategoryId] = useState<string | undefined>()

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { data: masters = [], isLoading } = useQuery({
    queryKey: ['masters', categoryId],
    queryFn: () => getMasters(categoryId),
  })

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-4 border-b border-secondary tma-safe-top">
        <h1 className="text-lg font-semibold mb-3">{t.masters.title}</h1>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setCategoryId(undefined)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 border transition-colors',
              !categoryId ? 'bg-primary text-primary-foreground border-primary' : 'border-secondary'
            )}
          >
            {t.masters.all}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 border transition-colors',
                categoryId === cat.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-secondary'
              )}
            >
              {categoryName(cat, language)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {isLoading && <div className="text-center text-muted py-8">...</div>}
        {!isLoading && masters.length === 0 && (
          <p className="text-center text-muted py-8">{t.masters.nothingHere}</p>
        )}
        {masters.map((master) => (
          <button
            key={master.id}
            onClick={() => navigate(`/masters/${master.id}`)}
            className="w-full text-left p-4 bg-secondary rounded-xl flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{master.name}</span>
              {typeof master.rating === 'number' && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{master.rating.toFixed(1)}</span>
                  <span className="text-muted">({master.reviewCount})</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {master.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="text-xs px-2 py-0.5 rounded-full bg-background border border-muted/30"
                >
                  {categoryName(cat, language)}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
