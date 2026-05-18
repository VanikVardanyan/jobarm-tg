import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Car, CarInput } from '@jobbarm/shared'
import { CAR_MAKES } from '@jobbarm/shared'
import { getCars, createCar, updateCar, deleteCar } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useToast } from '@/components/Toast'
import { Layout } from '@/components/Layout'

type Draft = { id: string | null; make: string; model: string; year: string; bodyType: string; color: string; licensePlate: string }

const emptyDraft: Draft = { id: null, make: CAR_MAKES[0], model: '', year: '', bodyType: '', color: '', licensePlate: '' }

export default function CarsPage() {
  const t = useT()
  const qc = useQueryClient()
  const { show } = useToast()
  const [draft, setDraft] = useState<Draft | null>(null)

  const { data: cars, isLoading, error } = useQuery({ queryKey: ['cars'], queryFn: getCars })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cars'] })

  const saveMut = useMutation({
    mutationFn: (d: Draft) => {
      const payload: CarInput = {
        make: d.make.trim(),
        model: d.model.trim(),
        year: Number(d.year),
        bodyType: d.bodyType.trim() || null,
        color: d.color.trim() || null,
        licensePlate: d.licensePlate.trim() || null,
      }
      return d.id ? updateCar(d.id, payload) : createCar(payload)
    },
    onSuccess: () => {
      invalidate()
      setDraft(null)
      show(t.garage.saved, 'success')
    },
    onError: () => show(t.errors.generic, 'error'),
  })

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCar(id),
    onSuccess: () => {
      invalidate()
      show(t.garage.deleted, 'success')
    },
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status
      show(status === 409 ? t.garage.inUse : t.errors.generic, 'error')
    },
  })

  const startEdit = (c: Car) =>
    setDraft({
      id: c.id,
      make: c.make,
      model: c.model,
      year: String(c.year),
      bodyType: c.bodyType ?? '',
      color: c.color ?? '',
      licensePlate: c.licensePlate ?? '',
    })

  const field = (label: string, value: string, onChange: (v: string) => void, opt = false) => (
    <label className="block mb-3">
      <span className="text-sm text-muted">
        {label}
        {opt ? ` (${t.garage.optional})` : ''}
      </span>
      <input
        className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )

  return (
    <Layout title={t.garage.title}>
      {isLoading && <p className="text-muted">…</p>}
      {error && <p className="text-rose-500">{t.errors.generic}</p>}

      {!draft && (
        <>
          {cars && cars.length === 0 && <p className="text-muted mb-4">{t.garage.empty}</p>}
          <div className="flex flex-col gap-2">
            {cars?.map((c) => (
              <div key={c.id} className="rounded-lg bg-secondary p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {c.make} {c.model} {c.year}
                  </div>
                  <div className="text-sm text-muted">
                    {[c.bodyType, c.color, c.licensePlate].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <button className="text-primary" onClick={() => startEdit(c)}>
                    {t.garage.edit}
                  </button>
                  <button
                    className="text-rose-500"
                    onClick={() => {
                      if (window.confirm(t.garage.confirmDelete)) delMut.mutate(c.id)
                    }}
                  >
                    {t.garage.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold"
            onClick={() => setDraft({ ...emptyDraft })}
          >
            {t.garage.add}
          </button>
        </>
      )}

      {draft && (
        <div>
          <label className="block mb-3">
            <span className="text-sm text-muted">{t.garage.make}</span>
            <select
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
              value={draft.make}
              onChange={(e) => setDraft({ ...draft, make: e.target.value })}
            >
              {CAR_MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          {field(t.garage.model, draft.model, (v) => setDraft({ ...draft, model: v }))}
          {field(t.garage.year, draft.year, (v) => setDraft({ ...draft, year: v }))}
          {field(t.garage.bodyType, draft.bodyType, (v) => setDraft({ ...draft, bodyType: v }), true)}
          {field(t.garage.color, draft.color, (v) => setDraft({ ...draft, color: v }), true)}
          {field(t.garage.plate, draft.licensePlate, (v) => setDraft({ ...draft, licensePlate: v }), true)}
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50"
              disabled={saveMut.isPending || !draft.make.trim() || !draft.model.trim() || !draft.year.trim()}
              onClick={() => saveMut.mutate(draft)}
            >
              {t.garage.save}
            </button>
            <button
              className="flex-1 rounded-lg bg-secondary py-3"
              onClick={() => setDraft(null)}
            >
              {t.garage.cancel}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
