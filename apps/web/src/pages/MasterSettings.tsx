import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { getMe, getCategories, putMeCategories } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'

export default function MasterSettings() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const language = useStore((s) => s.language)
  const showToast = useToast((s) => s.show)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const [selectedCats, setSelectedCats] = useState<string[]>([])

  useEffect(() => {
    if (me) setSelectedCats(me.categories.map((c) => c.id))
  }, [me])

  const saveMut = useMutation({
    mutationFn: () => putMeCategories(selectedCats),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] })
      showToast(t.profile.saved, 'success')
    },
    onError: () => showToast(t.errors.generic, 'error'),
  })

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-4 pb-4 border-b border-secondary tma-safe-top">
        <button onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">{t.profile.masterSettings}</span>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted">{t.profile.skills}</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full border text-sm transition-colors',
                  selectedCats.includes(cat.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-secondary'
                )}
              >
                {categoryName(cat, language)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => saveMut.mutate()}
          disabled={selectedCats.length === 0 || saveMut.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {saveMut.isPending ? '...' : t.profile.save}
        </button>
      </div>
    </div>
  )
}
