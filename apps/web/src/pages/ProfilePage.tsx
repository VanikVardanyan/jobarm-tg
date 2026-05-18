import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Language } from '@jobbarm/shared'
import { getMe, putMe } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { useStore } from '@/store'
import { useToast } from '@/components/Toast'
import { Layout } from '@/components/Layout'

export default function ProfilePage() {
  const t = useT()
  const qc = useQueryClient()
  const { show } = useToast()
  const setLanguage = useStore((s) => s.setLanguage)
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: getMe })

  const [phone, setPhone] = useState('')
  const [language, setLang] = useState<Language>('ru')

  useEffect(() => {
    if (me) {
      setPhone(me.phoneNumber ?? '')
      setLang(me.language)
    }
  }, [me])

  const saveMut = useMutation({
    mutationFn: () => putMe({ phoneNumber: phone.trim() || undefined, language }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['me'] })
      setLanguage(updated.language)
      show(t.profile.saved, 'success')
    },
    onError: () => show(t.errors.generic, 'error'),
  })

  return (
    <Layout title={t.profile.title}>
      {isLoading && <p className="text-muted">…</p>}
      <label className="block mb-3">
        <span className="text-sm text-muted">{t.profile.phone}</span>
        <input
          className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
          value={phone}
          inputMode="tel"
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm text-muted">{t.profile.language}</span>
        <select
          className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 outline-none"
          value={language}
          onChange={(e) => setLang(e.target.value as Language)}
        >
          <option value="ru">{t.profile.ru}</option>
          <option value="hy">{t.profile.hy}</option>
        </select>
      </label>
      <button
        className="w-full rounded-lg bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50"
        disabled={saveMut.isPending}
        onClick={() => saveMut.mutate()}
      >
        {t.profile.save}
      </button>
    </Layout>
  )
}
