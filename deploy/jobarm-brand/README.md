# Jobarm — Brand Assets

Минималистичный набор для лого и фавиконов проекта Jobarm.

## Концепция

Иконка построена на двух дугах, встречающихся в одной точке — абстракция
**рукопожатия / связи людей**. Без буквальности, легко читается даже на 16×16,
работает в моно и в цвете.

## Палитра

| Назначение | Hex | Где использовать |
|---|---|---|
| Brand Deep | `#0E7C8A` | основной teal, начало градиента |
| Brand Bright | `#14B8A6` | конец градиента, акцент |
| Brand Light (dark mode) | `#22D3EE` → `#2DD4BF` | градиент для тёмной темы |
| Text Dark | `#0F172A` | wordmark на light |
| Text Light | `#F8FAFC` | wordmark на dark |

Это спокойный градиент сине-зелёного — синий сторона добавляет доверия,
зелёная — действия и роста. Хорошо контрастирует и в Light, и в Dark mode.

## Файлы

### Логотипы (для UI и маркетинга)
- `jobarm-logo-horizontal.svg` — основной для светлой темы (хедер, футер)
- `jobarm-logo-horizontal-dark.svg` — для тёмной темы (белый wordmark, светлее градиент)
- `jobarm-icon.svg` — только знак, прозрачный фон
- `jobarm-icon-filled.svg` — знак на закруглённом teal-фоне (для аватарок, app icon)

### Фавиконы и иконки приложений (`favicon/`)
- `favicon.ico` — мульти-размерный (16/32/48), для устаревших браузеров
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-96x96.png`
- `apple-touch-icon.png` — 180×180, iOS home screen
- `android-chrome-192x192.png`, `android-chrome-512x512.png` — PWA / Android
- `icon.svg` — векторная иконка для современных браузеров (Next.js `app/icon.svg`)
- `icon-filled.svg` — векторная с фоном
- `og-icon-1024.png` — мастер 1024×1024 для соц. сетей
- `site.webmanifest` — PWA манифест

## Подключение в Next.js 14 (App Router)

Способ 1 — через файлы-конвенции (рекомендуется):

Скопируй в `app/`:
```
app/
  icon.svg              ← из favicon/icon.svg
  apple-icon.png        ← переименуй apple-touch-icon.png
```

Next сам сгенерирует нужные `<link>` теги.

Способ 2 — через `public/` и метаданные:

Скопируй всё из `favicon/` в `public/`, затем в `app/layout.tsx`:

```tsx
export const metadata = {
  title: 'Jobarm',
  description: 'Доска объявлений для быстрых разовых задач в Армении',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  themeColor: '#0E7C8A',
}
```

## Подключение в чистом HTML

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0E7C8A">
```

## Использование лого в React

```tsx
import Image from 'next/image'
import logoLight from '@/public/jobarm-logo-horizontal.svg'
import logoDark from '@/public/jobarm-logo-horizontal-dark.svg'

// В хедере с поддержкой dark mode:
<>
  <Image src={logoLight} alt="Jobarm" height={32} className="dark:hidden" priority />
  <Image src={logoDark}  alt="Jobarm" height={32} className="hidden dark:block" priority />
</>
```

## Правила применения

- Минимальная высота wordmark — **24px**, иконки — **16px**
- Отступ безопасности вокруг лого — половина высоты иконки
- На фото / сложных фонах — используй `icon-filled.svg` (плотный фон)
- Не растягивай, не меняй пропорции, не заменяй цвета вне палитры
