import { useStore } from '@/store'

const ru = {
  app: {
    name: 'Авто-сервис',
    loading: 'Загрузка…',
    openInTelegram: 'Откройте приложение через Telegram',
    placeholder: 'Скоро здесь появится поиск автосервиса',
  },
  errors: {
    generic: 'Что-то пошло не так',
  },
}

type Strings = typeof ru

const hy: Strings = {
  app: {
    name: 'Ավտոսերվիս',
    loading: 'Բեռնում…',
    openInTelegram: 'Բացեք հավելվածը Telegram-ի միջոցով',
    placeholder: 'Շուտով այստեղ կլինի ավտոսերվիսի որոնում',
  },
  errors: {
    generic: 'Ինչ-որ բան սխալ է գնացել',
  },
}

const strings: Record<string, Strings> = { ru, hy }

export function useT(): Strings {
  const language = useStore((s) => s.language)
  return strings[language] ?? strings.ru
}
