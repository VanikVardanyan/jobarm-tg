import { Composer } from 'grammy'
import type { BotContext } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language } from '@jobbarm/shared'
import { languageKeyboard } from '../keyboards.js'
import { showMenu } from './start.js'

export const miscHandler = new Composer<BotContext>()

function lang(ctx: BotContext): Language {
  return (ctx.dbUser?.language as Language) ?? 'ru'
}

miscHandler.command('help', async (ctx) => {
  await ctx.reply(t(lang(ctx), 'help'))
})

miscHandler.command('language', async (ctx) => {
  await ctx.reply(t(lang(ctx), 'languageChoose'), { reply_markup: languageKeyboard() })
})

miscHandler.command('cancel', async (ctx) => {
  const active = await ctx.conversation.active()
  if (Object.keys(active).length === 0) {
    await ctx.reply(t(lang(ctx), 'nothingToCancel'))
    return
  }
  await ctx.conversation.exit()
  await ctx.reply(t(lang(ctx), 'cancelled'))
})

miscHandler.callbackQuery(/^lang:(ru|hy)$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const next = ctx.match![1] as Language
  const updated = await db.user.update({
    where: { id: ctx.dbUser.id },
    data: { language: next },
  })
  ctx.dbUser = updated
  await ctx.reply(t(next, 'languageSet'))
  await showMenu(ctx)
})

miscHandler.callbackQuery('menu:help', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.reply(t(lang(ctx), 'help'))
})

// Phase-2/3 destinations — not dead: acknowledge + "coming soon" for now.
miscHandler.callbackQuery(
  /^menu:(create_request|my_requests|my_cars|available_requests|my_offers|active_jobs|profile)$/,
  async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(t(lang(ctx), 'comingSoon'))
  }
)
