import type { Language } from '@jobbarm/shared'

type Dict = Record<string, string>

const ru: Dict = {
  banned: '🚫 Доступ заблокирован администратором.',
  chooseRole: 'Привет! Я помогу с автосервисом. Кто вы?',
  roleClient: '🔍 Я ищу автосервис',
  roleService: '🔧 Я автосервис',
  roleSetClient: 'Готово! Вы — клиент. Опишите проблему — получите предложения от автосервисов.',
  clientMenuTitle: 'Главное меню',
  btnCreateRequest: '🚗 Создать заявку',
  btnMyRequests: '📋 Мои заявки',
  btnMyCars: '🚙 Мои машины',
  btnHelp: '❓ Помощь',
  comingSoon: 'Скоро будет доступно 🛠',
  serviceNeedsRegister: 'Чтобы получать заявки, зарегистрируйте автосервис.',
  btnRegisterService: '🔧 Зарегистрировать сервис',
  servicePending: '⏳ Ваш сервис на модерации. Мы уведомим вас после проверки.',
  serviceMenuTitle: 'Меню автосервиса',
  btnAvailableRequests: '📥 Доступные заявки',
  btnMyOffers: '📤 Мои предложения',
  btnActiveJobs: '🔧 Текущие заказы',
  btnProfile: '⚙️ Мой профиль',
  help: 'Это бот авто-сервис маркетплейса.\n\nКлиенты создают заявки на ремонт, автосервисы присылают предложения с ценой. Команды:\n/start — начало\n/language — сменить язык\n/cancel — отменить текущее действие\n/help — эта справка',
  languageChoose: 'Выберите язык:',
  languageSet: 'Язык изменён на русский.',
  cancelled: 'Действие отменено.',
  nothingToCancel: 'Нет активных действий.',
  regName: 'Название автосервиса?',
  regDescription: 'Краткое описание услуг (или отправьте «-»):',
  regAddress: 'Адрес сервиса?',
  regDistrict: 'Выберите район Еревана:',
  regPhone: 'Контактный телефон?',
  regSpecs: 'Выберите специализации (можно несколько), затем «Готово»:',
  regSpecsDone: '✅ Готово',
  regSpecsEmpty: 'Выберите хотя бы одну специализацию.',
  regPhotos: 'Пришлите 1–5 фото мастерской или нажмите «Пропустить».',
  regPhotosSkip: 'Пропустить',
  regPhotosDone: 'Готово',
  regPhotosMore: 'Фото добавлено ({n}/5). Ещё или «Готово».',
  regDone: '✅ Заявка на регистрацию отправлена. Сервис на модерации — мы уведомим вас.',
  regAbortNoText: 'Ожидался текст. Регистрация отменена, начните заново через меню.',
  adminNewService: '🆕 *Новый сервис на модерации*\n\n🏢 {name}\n📍 {district}, {address}\n📞 {phone}\n🔧 {specs}',
}

const hy: Dict = {
  banned: '🚫 Մուտքն արգելափակված է ադմինիստրատորի կողմից։',
  chooseRole: 'Բարև։ Կօգնեմ ավտոսերվիսի հարցում։ Ո՞վ եք դուք',
  roleClient: '🔍 Փնտրում եմ ավտոսերվիս',
  roleService: '🔧 Ես ավտոսերվիս եմ',
  roleSetClient: 'Պատրաստ է։ Դուք հաճախորդ եք։ Նկարագրեք խնդիրը — կստանաք առաջարկներ։',
  clientMenuTitle: 'Գլխավոր մենյու',
  btnCreateRequest: '🚗 Ստեղծել հայտ',
  btnMyRequests: '📋 Իմ հայտերը',
  btnMyCars: '🚙 Իմ մեքենաները',
  btnHelp: '❓ Օգնություն',
  comingSoon: 'Շուտով հասանելի կլինի 🛠',
  serviceNeedsRegister: 'Հայտեր ստանալու համար գրանցեք ավտոսերվիսը։',
  btnRegisterService: '🔧 Գրանցել սերվիսը',
  servicePending: '⏳ Ձեր սերվիսը մոդերացիայի մեջ է։ Կտեղեկացնենք ստուգումից հետո։',
  serviceMenuTitle: 'Ավտոսերվիսի մենյու',
  btnAvailableRequests: '📥 Հասանելի հայտեր',
  btnMyOffers: '📤 Իմ առաջարկները',
  btnActiveJobs: '🔧 Ընթացիկ պատվերներ',
  btnProfile: '⚙️ Իմ պրոֆիլը',
  help: 'Սա ավտոսերվիս մարկետփլեյսի բոտն է։\n\nՀաճախորդները ստեղծում են վերանորոգման հայտեր, սերվիսները ուղարկում են գնային առաջարկներ։ Հրամաններ՝\n/start — սկիզբ\n/language — փոխել լեզուն\n/cancel — չեղարկել գործողությունը\n/help — այս օգնությունը',
  languageChoose: 'Ընտրեք լեզուն՝',
  languageSet: 'Լեզուն փոխվեց հայերենի։',
  cancelled: 'Գործողությունը չեղարկվեց։',
  nothingToCancel: 'Ակտիվ գործողություններ չկան։',
  regName: 'Ավտոսերվիսի անվանումը՞',
  regDescription: 'Ծառայությունների կարճ նկարագրություն (կամ ուղարկեք «-»)՝',
  regAddress: 'Սերվիսի հասցեն՞',
  regDistrict: 'Ընտրեք Երևանի վարչական շրջանը՝',
  regPhone: 'Կոնտակտային հեռախոսը՞',
  regSpecs: 'Ընտրեք մասնագիտացումները (մի քանիսը), ապա «Պատրաստ է»՝',
  regSpecsDone: '✅ Պատրաստ է',
  regSpecsEmpty: 'Ընտրեք առնվազն մեկ մասնագիտացում։',
  regPhotos: 'Ուղարկեք արհեստանոցի 1–5 լուսանկար կամ սեղմեք «Բաց թողնել»։',
  regPhotosSkip: 'Բաց թողնել',
  regPhotosDone: 'Պատրաստ է',
  regPhotosMore: 'Լուսանկարն ավելացվեց ({n}/5)։ Ավելին կամ «Պատրաստ է»։',
  regDone: '✅ Գրանցման հայտն ուղարկվեց։ Սերվիսը մոդերացիայի մեջ է — կտեղեկացնենք։',
  regAbortNoText: 'Սպասվում էր տեքստ։ Գրանցումը չեղարկվեց, սկսեք նորից մենյուից։',
  adminNewService: '🆕 *Նոր սերվիս մոդերացիայի*\n\n🏢 {name}\n📍 {district}, {address}\n📞 {phone}\n🔧 {specs}',
}

const dicts: Record<Language, Dict> = { ru, hy }

export function normalizeLang(code: string | null | undefined): Language {
  return code === 'hy' ? 'hy' : 'ru'
}

export function t(lang: Language, key: string, vars?: Record<string, string | number>): string {
  let s = dicts[lang]?.[key] ?? dicts.ru[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}
