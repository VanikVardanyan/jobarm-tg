import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { getMe, putMe, postMeMaster, putMeCategories, getCategories } from '@/lib/api'
import { useToast } from '@/components/Toast'
import { cn } from '@/lib/utils'

export default function Profile() {
  const t = useT()
  const qc = useQueryClient()
  const showToast = useToast((s) => s.show)
  const { activeRole, isMaster, language, themeMode, setActiveRole, setLanguage, setThemeMode, setIsMaster } = useStore()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [showMasterForm, setShowMasterForm] = useState(false)

  useEffect(() => {
    if (me) {
      setName(me.name)
      setPhone(me.phone)
      setSelectedCats(me.categories.map((c) => c.id))
    }
  }, [me])

  const saveMut = useMutation({
    mutationFn: async () => {
      await putMe({ name, phone, language })
      if (isMaster) await putMeCategories(selectedCats)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] })
      showToast(t.profile.saved, 'success')
    },
    onError: () => showToast(t.errors.generic, 'error'),
  })

  const becomeMasterMut = useMutation({
    mutationFn: () => postMeMaster(selectedCats),
    onSuccess: () => {
      setIsMaster(true)
      setShowMasterForm(false)
      void qc.invalidateQueries({ queryKey: ['me'] })
      showToast(t.profile.saved, 'success')
    },
    onError: () => showToast(t.errors.generic, 'error'),
  })

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-lg font-semibold">{t.profile.title}</h1>

      {isMaster && (
        <div className="flex p-1 rounded-xl bg-secondary">
          {(['customer', 'master'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                activeRole === role
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted'
              )}
            >
              {role === 'customer' ? t.onboarding.asCustomer : t.onboarding.asMaster}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.profile.name}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-xl bg-secondary outline-none text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.profile.phone}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className="w-full p-3 rounded-xl bg-secondary outline-none text-base"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.profile.language}</label>
          <div className="flex gap-2">
            {(['hy', 'ru', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={cn(
                  'flex-1 py-2 rounded-xl border text-sm font-medium transition-colors',
                  language === l
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-secondary'
                )}
              >
                {l === 'hy' ? 'Հայ' : l === 'ru' ? 'Рус' : 'Eng'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.profile.theme}</label>
          <div className="flex gap-2">
            {(['auto', 'light', 'dark'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setThemeMode(m)}
                className={cn(
                  'flex-1 py-2 rounded-xl border text-sm font-medium transition-colors',
                  themeMode === m
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-secondary'
                )}
              >
                {m === 'auto' ? t.profile.themeAuto : m === 'light' ? t.profile.themeLight : t.profile.themeDark}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isMaster && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t.onboarding.selectCategories}</p>
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
      )}

      {!isMaster && !showMasterForm && (
        <button
          onClick={() => setShowMasterForm(true)}
          className="w-full py-2.5 rounded-xl border border-primary text-primary font-medium text-sm"
        >
          {t.profile.becomeMaster}
        </button>
      )}

      {!isMaster && showMasterForm && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t.onboarding.selectCategories}</p>
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
          <button
            onClick={() => becomeMasterMut.mutate()}
            disabled={selectedCats.length === 0 || becomeMasterMut.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {becomeMasterMut.isPending ? '...' : t.profile.save}
          </button>
        </div>
      )}

      {(!isMaster ? !showMasterForm : true) && (
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {saveMut.isPending ? '...' : t.profile.save}
        </button>
      )}
    </div>
  )
}
