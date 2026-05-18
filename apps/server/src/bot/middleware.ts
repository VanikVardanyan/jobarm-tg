import type { NextFunction } from 'grammy'
import type { BotContext } from './context.js'
import { db } from '../db.js'
import { normalizeLang, t } from './i18n.js'
import type { Language } from '@jobbarm/shared'

// Upsert the Telegram user and attach the DB row as ctx.dbUser.
export async function loadUser(ctx: BotContext, next: NextFunction): Promise<void> {
  const from = ctx.from
  if (!from) return // ignore updates without a user (channel posts etc.)
  const telegramId = String(from.id)
  const chatId = String(ctx.chat?.id ?? from.id)
  const lang: Language = normalizeLang(from.language_code)

  const user = await db.user.upsert({
    where: { telegramId },
    update: { chatId },
    create: {
      telegramId,
      chatId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      language: lang,
    },
  })

  ctx.dbUser = user
  await next()
}

// Block banned users early (after loadUser).
export async function banGate(ctx: BotContext, next: NextFunction): Promise<void> {
  if (ctx.dbUser?.isBanned) {
    const lang = (ctx.dbUser.language as Language) ?? 'ru'
    await ctx.reply(t(lang, 'banned'))
    return // stop the middleware chain
  }
  await next()
}
