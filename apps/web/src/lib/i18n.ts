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
  nav: { requests: 'Заявки', garage: 'Гараж', profile: 'Профиль' },
  requests: {
    title: 'Мои заявки',
    empty: 'Заявок пока нет. Создайте заявку через бота.',
    photos: '📷 {n} фото',
    voice: '🎤 голосовое',
    car: 'Машина',
    district: 'Район',
    urgency: 'Срочность',
    status: 'Статус',
    drivable: 'На ходу',
    notDrivable: 'Не на ходу',
    description: 'Описание',
    created: 'Создана',
    back: '← Назад',
    notFound: 'Заявка не найдена',
  },
  garage: {
    title: 'Гараж',
    empty: 'В гараже пока нет машин.',
    add: 'Добавить машину',
    edit: 'Изменить',
    delete: 'Удалить',
    save: 'Сохранить',
    cancel: 'Отмена',
    make: 'Марка',
    model: 'Модель',
    year: 'Год',
    bodyType: 'Кузов',
    color: 'Цвет',
    plate: 'Гос. номер',
    optional: 'необязательно',
    confirmDelete: 'Удалить эту машину?',
    inUse: 'Нельзя удалить: машина используется в заявке.',
    saved: 'Сохранено',
    deleted: 'Удалено',
  },
  profile: {
    title: 'Профиль',
    phone: 'Телефон',
    language: 'Язык',
    ru: 'Русский',
    hy: 'Армянский',
    save: 'Сохранить',
    saved: 'Сохранено',
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
  nav: { requests: 'Հայտեր', garage: 'Ավտոտնակ', profile: 'Պրոֆիլ' },
  requests: {
    title: 'Իմ հայտերը',
    empty: 'Հայտեր դեռ չկան։ Ստեղծեք հայտ բոտի միջոցով։',
    photos: '📷 {n} լուսանկար',
    voice: '🎤 ձայնային',
    car: 'Մեքենա',
    district: 'Շրջան',
    urgency: 'Հրատապություն',
    status: 'Կարգավիճակ',
    drivable: 'Ընթացքի մեջ է',
    notDrivable: 'Ընթացքի մեջ չէ',
    description: 'Նկարագրություն',
    created: 'Ստեղծված',
    back: '← Հետ',
    notFound: 'Հայտը չի գտնվել',
  },
  garage: {
    title: 'Ավտոտնակ',
    empty: 'Ավտոտնակում դեռ մեքենա չկա։',
    add: 'Ավելացնել մեքենա',
    edit: 'Փոփոխել',
    delete: 'Ջնջել',
    save: 'Պահպանել',
    cancel: 'Չեղարկել',
    make: 'Մակնիշ',
    model: 'Մոդել',
    year: 'Տարի',
    bodyType: 'Թափք',
    color: 'Գույն',
    plate: 'Պետհամարանիշ',
    optional: 'ոչ պարտադիր',
    confirmDelete: 'Ջնջե՞լ այս մեքենան։',
    inUse: 'Հնարավոր չէ ջնջել՝ մեքենան օգտագործվում է հայտում։',
    saved: 'Պահպանվեց',
    deleted: 'Ջնջվեց',
  },
  profile: {
    title: 'Պրոֆիլ',
    phone: 'Հեռախոս',
    language: 'Լեզու',
    ru: 'Ռուսերեն',
    hy: 'Հայերեն',
    save: 'Պահպանել',
    saved: 'Պահպանվեց',
  },
}

const strings: Record<string, Strings> = { ru, hy }

export function useT(): Strings {
  const language = useStore((s) => s.language)
  return strings[language] ?? strings.ru
}
