import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, Smartphone, ChevronRight, Camera } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'
import { useT, categoryName } from '@/lib/i18n'
import { getMe, putMe, postMeMaster, getCategories, uploadAvatar } from '@/lib/api'
import { fileToJpeg } from '@/lib/image'
import { useToast } from '@/components/Toast'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'

export default function Profile() {
  const t = useT()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const showToast = useToast((s) => s.show)
  const { isMaster, language, themeMode, setLanguage, setThemeMode, setIsMaster } = useStore()

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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarMut = useMutation({
    mutationFn: (blob: Blob) => uploadAvatar(blob),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] })
      showToast(t.profile.saved, 'success')
    },
    onError: () => showToast(t.errors.generic, 'error'),
  })

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      showToast(language === 'hy' ? 'Նկարը շատ մեծ է' : language === 'en' ? 'Image too large' : 'Слишком большая картинка', 'error')
      return
    }
    try {
      const jpeg = await fileToJpeg(file, 1024)
      avatarMut.mutate(jpeg)
    } catch {
      showToast(language === 'hy' ? 'Չհաջողվեց բեռնել նկարը' : language === 'en' ? 'Cannot read image' : 'Не удалось прочесть картинку', 'error')
    }
  }

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  return (
    <div className="px-4 pb-4 flex flex-col gap-6 tma-safe-top">
      <h1 className="text-lg font-semibold">{t.profile.title}</h1>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={avatarMut.isPending}
          className="relative group"
          aria-label="Change avatar"
        >
          <Avatar url={me?.avatarUrl} name={name || me?.name || '?'} size={96} />
          <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-active:opacity-100 flex items-center justify-center transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </span>
          <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
            <Camera className="w-4 h-4" />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          className="hidden"
          onChange={onPickFile}
        />
      </div>


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
            {([
              { mode: 'auto' as const, Icon: Smartphone, label: t.profile.themeAuto },
              { mode: 'light' as const, Icon: Sun, label: t.profile.themeLight },
              { mode: 'dark' as const, Icon: Moon, label: t.profile.themeDark },
            ]).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                aria-label={label}
                className={cn(
                  'flex-1 flex items-center justify-center py-3 rounded-xl border transition-colors',
                  themeMode === mode
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-secondary'
                )}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {isMaster && (
        <button
          onClick={() => navigate('/profile/master')}
          className="flex items-center justify-between w-full p-4 rounded-xl bg-secondary"
        >
          <span className="text-sm font-medium">{t.profile.masterSettings}</span>
          <ChevronRight className="w-5 h-5 text-muted" />
        </button>
      )}

      {me?.isAdmin && (
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center justify-between w-full p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10"
        >
          <span className="text-sm font-medium">👑 Админка</span>
          <ChevronRight className="w-5 h-5 text-muted" />
        </button>
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
