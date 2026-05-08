import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useT } from '@/lib/i18n'
import { getCategories, postJob } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'

export default function CreateJob() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const mut = useMutation({
    mutationFn: () =>
      postJob({ categoryId, description, budget: Number(budget), dateFrom, dateTo }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['jobs', 'my'] })
      navigate('/home')
    },
  })

  const valid =
    categoryId && description.length >= 10 && Number(budget) > 0 && dateFrom && dateTo

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
            className="w-full p-3 rounded-xl bg-secondary outline-none text-sm"
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameRu}
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
            className="w-full p-3 rounded-xl bg-secondary outline-none resize-none text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.createJob.budget}</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full p-3 rounded-xl bg-secondary outline-none text-sm"
            min={1}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-sm text-muted">{t.createJob.dateFrom}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-3 rounded-xl bg-secondary outline-none text-sm"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-sm text-muted">{t.createJob.dateTo}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-3 rounded-xl bg-secondary outline-none text-sm"
            />
          </div>
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={!valid || mut.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {mut.isPending ? '...' : t.createJob.submit}
        </button>
      </div>
    </div>
  )
}
