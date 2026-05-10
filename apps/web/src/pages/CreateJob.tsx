import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { getCategories, postJob } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { ArrowLeft } from 'lucide-react'

export default function CreateJob() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const language = useStore((s) => s.language)
  const showToast = useToast((s) => s.show)

  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [dateFrom, setDateFrom] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const mut = useMutation({
    mutationFn: () =>
      postJob({ categoryId, description, budget: Number(budget), dateFrom, dateTo: dateFrom }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['jobs', 'my'] })
      navigate('/home')
    },
    onError: (err) => {
      console.error('Job creation failed:', err)
      showToast(t.errors.generic, 'error')
    },
  })

  const submit = () => {
    if (!categoryId) return showToast('Выберите категорию', 'error')
    if (description.trim().length < 10) return showToast('Описание минимум 10 символов', 'error')
    if (!(Number(budget) > 0)) return showToast('Укажите бюджет', 'error')
    if (!dateFrom) return showToast('Укажите дату', 'error')
    mut.mutate()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 p-4 border-b border-secondary">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold">{t.createJob.title}</span>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.createJob.category}</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-secondary outline-none text-base appearance-none bg-[length:1em] bg-[right_0.75rem_center] bg-no-repeat pr-10 bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%20fill=%22currentColor%22><path%20fill-rule=%22evenodd%22%20d=%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule=%22evenodd%22/></svg>')]"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c, language)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.createJob.description}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.createJob.descriptionPlaceholder}
            rows={4}
            className="w-full p-3 rounded-xl bg-secondary outline-none resize-none text-base"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.createJob.budget}</label>
          <input
            type="text"
            inputMode="numeric"
            value={budget ? Number(budget).toLocaleString('ru-RU') : ''}
            onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-full p-3 rounded-xl bg-secondary outline-none text-base"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.createJob.dateFrom}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full h-12 px-3 rounded-xl bg-secondary outline-none text-base"
          />
        </div>

        <button
          onClick={submit}
          disabled={mut.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {mut.isPending ? '...' : t.createJob.submit}
        </button>
      </div>
    </div>
  )
}
