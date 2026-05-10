import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { getMe, putMe, postMeMaster, putMeCategories, getCategories } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function Profile() {
  const t = useT()
  const qc = useQueryClient()
  const { activeRole, isMaster, language, setActiveRole, setLanguage, setIsMaster } = useStore()

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
    mutationFn: () => putMe({ name, phone, language }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  })

  const becomeMasterMut = useMutation({
    mutationFn: () => postMeMaster(selectedCats),
    onSuccess: () => {
      setIsMaster(true)
      setShowMasterForm(false)
      void qc.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const updateCatsMut = useMutation({
    mutationFn: () => putMeCategories(selectedCats),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me'] }),
  })

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-lg font-semibold">{t.profile.title}</h1>

      {isMaster && (
        <button
          onClick={() => setActiveRole(activeRole === 'customer' ? 'master' : 'customer')}
          className="w-full py-2.5 rounded-xl border border-primary text-primary font-medium text-sm"
        >
          {activeRole === 'customer' ? t.profile.switchToMaster : t.profile.switchToCustomer}
        </button>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.profile.name}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-xl bg-secondary outline-none text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted">{t.profile.phone}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className="w-full p-3 rounded-xl bg-secondary outline-none text-sm"
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
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
        >
          {t.profile.save}
        </button>
      </div>

      {!isMaster && (
        <div>
          {!showMasterForm ? (
            <button
              onClick={() => setShowMasterForm(true)}
              className="w-full py-2.5 rounded-xl border border-primary text-primary font-medium text-sm"
            >
              {t.profile.becomeMaster}
            </button>
          ) : (
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
        </div>
      )}

      {isMaster && (
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
            onClick={() => updateCatsMut.mutate()}
            disabled={selectedCats.length === 0 || updateCatsMut.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {updateCatsMut.isPending ? '...' : t.profile.save}
          </button>
        </div>
      )}
    </div>
  )
}
