# Технический проект: Auto Service Marketplace Bot

Telegram-бот + Mini App для соединения клиентов с автосервисами в Армении.

## Общая концепция

Клиент создаёт заявку через бот (описание проблемы + фото + локация). Автосервисы получают заявку, отправляют свои предложения с ценой. Клиент видит все предложения, выбирает подходящее, получает контакты сервиса и общается с ним напрямую (звонок/WhatsApp/Telegram).

**На MVP всё бесплатно** — никакой монетизации, плата за отклики или подписок. Цель: проверить что люди этим пользуются.

## Технологический стек

### Backend
- **Node.js** + **TypeScript**
- **Fastify** (легче и быстрее Express)
- **grammY** — лучшая Telegram Bot библиотека для Node.js
- **PostgreSQL** — основная база данных
- **Prisma ORM** — для работы с базой
- **Zod** — валидация данных
- **Pino** — логирование

### Frontend (Mini App)
- **React** + **TypeScript** + **Vite**
- **Telegram Mini Apps SDK** (`@telegram-apps/sdk-react`)
- **Tailwind CSS** для стилей
- **shadcn/ui** для компонентов
- **React Hook Form** + **Zod** для форм
- **TanStack Query** для API-запросов

### Хранилище
- **Telegram file_id** для фото (на MVP — без внешнего хранилища, бесплатно и просто)

### Инфраструктура
- **Hetzner Cloud CX22** (~$5/мес)
- **Docker** + **Docker Compose**
- **Caddy** как reverse proxy + автоматический SSL
- Домен с поддоменами: `bot.example.am` (API), `app.example.am` (Mini App)

## Структура проекта

```
auto-service-bot/
├── apps/
│   ├── backend/              # Fastify API + Telegram bot
│   │   ├── src/
│   │   │   ├── bot/          # Telegram bot handlers
│   │   │   ├── api/          # HTTP API для Mini App
│   │   │   ├── services/     # Бизнес-логика
│   │   │   ├── db/           # Prisma client
│   │   │   ├── utils/        # Утилиты
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   └── webapp/               # Mini App на React
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── api/
│       │   └── main.tsx
│       └── package.json
├── docker-compose.yml
├── Caddyfile
└── package.json              # Workspace root
```

## Модели данных (Prisma schema)

```prisma
// Пользователи (и клиенты, и автосервисы)
model User {
  id              String   @id @default(cuid())
  telegramId      BigInt   @unique
  username        String?
  firstName       String?
  lastName        String?
  phoneNumber     String?
  role            UserRole // CLIENT или SERVICE
  language        String   @default("ru") // ru, hy, en
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Связи
  cars            Car[]
  requests        Request[]            // если клиент
  service         ServiceProfile?      // если автосервис
  offers          Offer[]              // если автосервис — его предложения
  receivedReviews Review[] @relation("ReviewedService")
  givenReviews    Review[] @relation("ReviewAuthor")
}

enum UserRole {
  CLIENT
  SERVICE
}

// Профиль автосервиса
model ServiceProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  name            String   // Название сервиса
  description     String?
  address         String
  district        String   // Район Еревана
  phoneNumber     String
  latitude        Float?
  longitude       Float?
  specializations String[] // Массив типов услуг которые делают
  workingHours    Json?    // {monday: "9:00-19:00", ...}
  isVerified      Boolean  @default(false) // Прошёл ли модерацию админом
  isActive        Boolean  @default(true)
  photos          String[] // Telegram file_ids фото мастерской
  createdAt       DateTime @default(now())
}

// Машины клиентов (гараж)
model Car {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  make        String   // Toyota, BMW...
  model       String   // X5, Camry...
  year        Int
  bodyType    String?  // sedan, suv, hatchback...
  color       String?
  licensePlate String?
  createdAt   DateTime @default(now())

  requests    Request[]
}

// Заявка от клиента
model Request {
  id            String        @id @default(cuid())
  clientId      String
  client        User          @relation(fields: [clientId], references: [id])
  carId         String
  car           Car           @relation(fields: [carId], references: [id])
  serviceType   ServiceType   // Тип услуги
  description   String        // Описание проблемы
  voiceFileId   String?       // Telegram file_id голосового сообщения (если есть)
  photos        String[]      // Массив Telegram file_ids
  district      String        // Район Еревана
  urgency       Urgency       @default(NORMAL)
  isDrivable    Boolean       @default(true) // Машина на ходу
  status        RequestStatus @default(OPEN)
  selectedOfferId String?     @unique
  selectedOffer   Offer?      @relation("SelectedOffer", fields: [selectedOfferId], references: [id])
  createdAt     DateTime      @default(now())
  expiresAt     DateTime      // Через сколько закрывается (по умолчанию +24 часа)

  offers        Offer[]
  reviews       Review[]
}

enum ServiceType {
  BODY_PAINT       // Кузовной ремонт и покраска
  ENGINE_CHASSIS   // Двигатель и ходовая
  MAINTENANCE      // ТО и расходники
  TIRES            // Шиномонтаж
  ELECTRICAL       // Электрика
  AC               // Кондиционер
  GLASS            // Стёкла
  INTERIOR         // Салон / химчистка
  OTHER            // Другое
}

enum Urgency {
  URGENT      // Сегодня
  THIS_WEEK   // На этой неделе
  NORMAL      // Не срочно
}

enum RequestStatus {
  OPEN        // Открыта, ждёт предложений
  IN_PROGRESS // Клиент выбрал сервис
  COMPLETED   // Работа выполнена
  CANCELLED   // Отменена клиентом
  EXPIRED     // Истёк срок
}

// Предложение от автосервиса
model Offer {
  id          String   @id @default(cuid())
  requestId   String
  request     Request  @relation(fields: [requestId], references: [id])
  serviceId   String   // ID юзера-сервиса
  service     User     @relation(fields: [serviceId], references: [id])
  price       Int      // В драмах
  priceMax    Int?     // Если диапазон цен
  comment     String?
  duration    String?  // "1-2 дня", "сегодня"
  examplePhotos String[] // Фото похожих работ
  createdAt   DateTime @default(now())

  selectedFor Request? @relation("SelectedOffer")

  @@unique([requestId, serviceId]) // Один сервис — одно предложение на заявку
}

// Отзывы (после выполнения работы)
model Review {
  id          String   @id @default(cuid())
  requestId   String
  request     Request  @relation(fields: [requestId], references: [id])
  authorId    String
  author      User     @relation("ReviewAuthor", fields: [authorId], references: [id])
  serviceId   String
  service     User     @relation("ReviewedService", fields: [serviceId], references: [id])
  rating      Int      // 1-5
  text        String?
  photos      String[] // Фото результата (опционально)
  createdAt   DateTime @default(now())
}
```

## Пользовательские потоки

### Поток клиента

**1. Первое использование**
- Открывает `t.me/your_bot`
- Бот приветствует: «Привет! Помогу найти автосервис. Покажи проблему — получи предложения.»
- Кнопки: `🚗 Создать заявку`, `📋 Мои заявки`, `🚙 Мои машины`, `❓ Помощь`

**2. Создание заявки (через Mini App)**
- Нажимает `🚗 Создать заявку` → открывается Mini App
- Шаг 1: Выбор машины (если есть в гараже — выбирает; если нет — добавляет)
- Шаг 2: Выбор типа услуги (карточки с иконками)
- Шаг 3: Описание проблемы (текст + опционально голосовое)
- Шаг 4: Загрузка фото (3-5 штук)
- Шаг 5: Локация (район Еревана из выпадающего списка)
- Шаг 6: Срочность и «машина на ходу»
- Шаг 7: Подтверждение → «Отправить»

**3. Получение предложений**
- Бот уведомляет: «Заявка отправлена X автосервисам в районе Y»
- Когда приходит предложение — пуш: «🔔 Auto Master прислал предложение: 45,000 драм»
- Можно открыть Mini App и видеть все предложения списком

**4. Выбор сервиса**
- В Mini App видит карточки предложений: название, цена, срок, комментарий, рейтинг, расстояние
- Нажимает `Выбрать` на лучшем предложении
- Получает: телефон, адрес, Telegram сервиса
- Звонит/пишет напрямую

**5. После работы**
- Через 3 дня бот пишет: «Как прошёл ремонт в Auto Master Plus?»
- Кнопки: `⭐⭐⭐⭐⭐` или `Оставить отзыв` или `Пожаловаться`

### Поток автосервиса

**1. Регистрация**
- Открывает бот, нажимает `Я автосервис`
- Заполняет: название, адрес, телефон, район, специализации, фото мастерской
- Статус: «На модерации» (админ должен одобрить)

**2. После одобрения**
- Уведомление: «Ваш сервис одобрен! Начнём получать заявки.»
- Получает push-уведомления при появлении заявок в его районе и по его специализациям

**3. Получение заявки**
- Push: «🚨 Новая заявка: BMW X5, 2019, бампер царапина, район Кентрон»
- Открывает Mini App → видит фото, описание, голосовое
- Кнопки: `Отправить предложение`, `Пропустить`

**4. Отправка предложения**
- Форма: цена (или диапазон), срок, комментарий, опционально фото примеров работ
- Отправляет → клиент получает уведомление

**5. Если клиент выбрал**
- Push: «🎉 Клиент выбрал вас! Заявка #1234. Контакты: +374...»
- Дальше общаются напрямую

## API Endpoints (для Mini App)

Авторизация через **Telegram Mini App initData** (валидация HMAC подписи).

### Клиент
```
GET    /api/me                      — мой профиль
PUT    /api/me                      — обновить (телефон, язык)

GET    /api/cars                    — мои машины
POST   /api/cars                    — добавить машину
PUT    /api/cars/:id                — обновить
DELETE /api/cars/:id                — удалить

POST   /api/requests                — создать заявку
GET    /api/requests                — мои заявки
GET    /api/requests/:id            — детали заявки
GET    /api/requests/:id/offers     — предложения по заявке
POST   /api/requests/:id/select-offer — выбрать предложение
POST   /api/requests/:id/cancel     — отменить

POST   /api/reviews                 — оставить отзыв

POST   /api/upload                  — загрузить файл в Telegram, получить file_id
```

### Автосервис
```
POST   /api/service/register        — регистрация сервиса
GET    /api/service/profile         — мой профиль сервиса
PUT    /api/service/profile         — обновить

GET    /api/service/requests        — доступные заявки (фильтр по району + специализации)
GET    /api/service/requests/:id    — детали заявки
POST   /api/service/requests/:id/offer — отправить предложение

GET    /api/service/my-offers       — мои предложения
GET    /api/service/active-jobs     — заявки где меня выбрали
GET    /api/service/reviews         — отзывы обо мне
```

### Справочники
```
GET    /api/districts               — список районов Еревана
GET    /api/car-makes               — марки машин
GET    /api/car-models/:make        — модели для марки
GET    /api/service-types           — типы услуг
```

## Telegram Bot Handlers

### Команды
- `/start` — приветствие, регистрация
- `/start service` — регистрация как автосервис
- `/help` — помощь
- `/cancel` — отменить текущее действие
- `/language` — сменить язык (ru/hy/en)

### Кнопки главного меню (клиент)
- `🚗 Создать заявку` → открыть Mini App на странице создания
- `📋 Мои заявки` → открыть Mini App со списком заявок
- `🚙 Мои машины` → открыть Mini App с гаражом
- `❓ Помощь` → текст помощи

### Кнопки главного меню (автосервис)
- `📥 Доступные заявки` → открыть Mini App со списком
- `📤 Мои предложения` → активные предложения
- `🔧 Текущие заказы` → заявки где выбрали меня
- `⚙️ Мой профиль` → редактировать

### Уведомления (отправляются из бэкенда)
- Клиенту: новое предложение получено
- Клиенту: напоминание о выборе через 6 часов после получения предложений
- Клиенту: через 3 дня — попросить отзыв
- Сервису: новая заявка в его районе
- Сервису: клиент выбрал ваше предложение
- Сервису: новый отзыв

## Дизайн Mini App

### Главные принципы
- **Mobile-first** (выглядит как нативное приложение в Telegram)
- Использовать **Telegram theme colors** (через `themeParams` из SDK) — автоматическая темная/светлая тема
- Большие кнопки, крупные шрифты — пользователи на телефоне
- Минимум полей в формах, максимум кнопок выбора

### Главные экраны клиента
1. **Главная** — кнопка «Новая заявка», список моих активных заявок
2. **Создание заявки** — пошаговая форма (5-7 шагов)
3. **Список заявок** — карточки с статусом
4. **Детали заявки** — описание + фото + предложения
5. **Карточка предложения** — фото сервиса, цена, рейтинг, комментарий, кнопка «Выбрать»
6. **Гараж** — список машин с возможностью добавить/удалить
7. **Профиль** — телефон, язык

### Главные экраны автосервиса
1. **Главная** — список доступных заявок
2. **Детали заявки** — фото, описание, форма предложения
3. **Мои предложения** — статусы (ждёт, принят, отклонён)
4. **Текущие заказы** — заявки где меня выбрали + контакты клиента
5. **Профиль** — настройки сервиса
6. **Отзывы** — все отзывы обо мне

## Особенности реализации

### Локализация
- Все тексты — через i18n
- Поддержка: **русский** (основной), **армянский**, **английский**
- Определять язык из Telegram `language_code`, дать возможность сменить
- На MVP можно начать с одного русского, остальные добавить позже

### Загрузка файлов
- Mini App **не загружает файлы напрямую** в бэкенд
- Используем подход: в Mini App нажимаешь «Прикрепить фото» → Mini App шлёт в бот команду «жду фото» → пользователь отправляет фото в чат с ботом → бот сохраняет `file_id` → Mini App забирает `file_id` из API
- Альтернатива: показать фото отправлять через бот напрямую, без Mini App

### Голосовые сообщения
- Принимаем как Telegram voice message
- Сохраняем `file_id`
- При показе автосервису — пересылаем через `sendVoice(file_id)`

### Поиск сервисов для заявки
- Когда клиент создал заявку — найти всех сервисов где:
  - `isVerified = true`
  - `isActive = true`
  - `district` совпадает с заявкой
  - `specializations` включает `serviceType` заявки
- Отправить им пуш-уведомление через бот

### Таймауты и фоновые задачи
- Заявка живёт 24 часа, потом `status = EXPIRED`
- Через 6 часов после получения предложений — напоминание клиенту
- Через 3 дня после выбора — попросить отзыв
- Использовать **node-cron** или **BullMQ** для фоновых задач

### Защита и валидация
- **Все API-запросы** проверяют Telegram initData (HMAC валидация)
- **Rate limiting** — не больше 10 заявок в день с одного клиента
- **Антиспам** для сервисов — не больше 50 предложений в день
- **Валидация** всех вводимых данных через Zod

### Админка
- На MVP — простая `/admin` страница с базовой авторизацией
- Список сервисов на модерации с кнопкой «Одобрить / Отклонить»
- Список всех заявок и предложений
- Можно блокировать пользователей и сервисы

## Деплой (Hetzner)

### Docker Compose структура
```yaml
services:
  postgres:    # PostgreSQL 16
  backend:     # Node.js приложение
  webapp:      # Статика Mini App (nginx)
  caddy:       # Reverse proxy + SSL
```

### Переменные окружения
```
BOT_TOKEN=          # Telegram bot token от BotFather
DATABASE_URL=       # postgres connection string
WEBAPP_URL=         # https://app.your-domain.am
API_URL=            # https://api.your-domain.am
ADMIN_TELEGRAM_IDS= # Список ID админов через запятую
NODE_ENV=production
```

### Шаги деплоя
1. Купить VPS на Hetzner (Ubuntu 24.04)
2. Установить Docker и Docker Compose
3. Купить домен, настроить DNS на сервер
4. Clone репозитория
5. Создать `.env` файл
6. `docker compose up -d`
7. Caddy автоматически получит SSL-сертификаты
8. Создать бота через `@BotFather`, установить webhook URL
9. В BotFather: `/setdomain` для Mini App, указать `https://app.your-domain.am`

## План разработки (этапы)

### Этап 1: Фундамент (3-5 дней)
- Настройка монорепо (Turborepo или npm workspaces)
- Prisma schema, миграции
- Базовый Fastify + бот grammY
- Telegram initData валидация
- Базовая авторизация в Mini App

### Этап 2: Клиентский поток (5-7 дней)
- Регистрация клиента
- CRUD машин
- Создание заявки (форма + загрузка фото через бот)
- Просмотр заявок и предложений

### Этап 3: Сервис поток (5-7 дней)
- Регистрация сервиса (с модерацией)
- Получение заявок в районе
- Отправка предложений
- Просмотр активных заказов

### Этап 4: Связка (3-5 дней)
- Уведомления через бот
- Выбор предложения, раскрытие контактов
- Отзывы и рейтинги

### Этап 5: Админка и деплой (3-5 дней)
- Простая админ-панель
- Deployment на Hetzner
- Тестирование

### Этап 6: Полировка
- i18n армянский и английский
- Голосовые сообщения
- Edge cases (отмены, ошибки)
- Аналитика (счётчики заявок, конверсии)

## Что НЕ делать на MVP

- ❌ Внутренний чат между клиентом и сервисом — раскрываем контакты сразу
- ❌ Платёжная система — всё бесплатно
- ❌ AI-оценка фото — добавим позже
- ❌ Подписки и тарифы для сервисов
- ❌ Эвакуатор и SOS-функции
- ❌ Внешнее облачное хранилище — используем Telegram file_id
- ❌ Сложная админка — самая базовая для модерации

## Критерии готовности MVP

✅ Клиент может зарегистрироваться и добавить машину
✅ Клиент может создать заявку с фото и описанием
✅ Автосервис может зарегистрироваться (с модерацией)
✅ Автосервис получает уведомление о новой заявке в его районе
✅ Автосервис может отправить предложение
✅ Клиент видит все предложения и может выбрать одно
✅ После выбора раскрываются контакты сервиса
✅ Клиент может оставить отзыв
✅ Работает на русском языке
✅ Развёрнуто на сервере с домена

## Первоочередные тестовые сценарии

1. Армен создаёт заявку: «Покрасить бампер BMW X5» с 3 фото
2. Auto Master Plus получает уведомление, отправляет 45,000 драм
3. Bumper Pro отправляет 38,000 драм
4. Армен видит оба предложения, выбирает Bumper Pro
5. Получает контакты, звонит, договаривается
6. Через 3 дня бот спрашивает отзыв
7. Армен ставит 5 звёзд

---

## Инструкции для Claude Code

1. **Начни с фундамента**: настрой монорепо, Prisma, Docker Compose
2. **Делай по этапам** из плана выше — не пытайся написать всё сразу
3. **Используй TypeScript строго** — без `any`
4. **Пиши простой код** — никаких сложных абстракций на MVP
5. **Логируй важные действия** — это поможет дебажить
6. **Английские названия в коде**, тексты для пользователей через i18n
7. **Тесты на MVP не нужны** — проверяем гипотезу
8. После каждого этапа — давай инструкцию как протестировать локально

При вопросах — сначала уточняй, потом пиши код. Не делай предположений без необходимости.
