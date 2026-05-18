import { Composer } from 'grammy'
import type { BotContext } from '../context.js'
import { db } from '../../db.js'
import { t } from '../i18n.js'
import type { Language } from '@jobbarm/shared'
import {
  roleKeyboard,
  clientMenuKeyboard,
  serviceMenuKeyboard,
  serviceRegisterKeyboard,
} from '../keyboards.js'

export const startHandler = new Composer<BotContext>()

// Render the role-appropriate menu (or role chooser / service moderation state).
export async function showMenu(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser
  const lang = (user.language as Language) ?? 'ru'

  if (!user.role) {
    await ctx.reply(t(lang, 'chooseRole'), { reply_markup: roleKeyboard(lang) })
    return
  }

  if (user.role === 'CLIENT') {
    await ctx.reply(t(lang, 'clientMenuTitle'), { reply_markup: clientMenuKeyboard(lang) })
    return
  }

  // SERVICE
  const profile = await db.serviceProfile.findUnique({ where: { userId: user.id } })
  if (!profile) {
    await ctx.reply(t(lang, 'serviceNeedsRegister'), {
      reply_markup: serviceRegisterKeyboard(lang),
    })
    return
  }
  if (!profile.isVerified) {
    await ctx.reply(t(lang, 'servicePending'))
    return
  }
  await ctx.reply(t(lang, 'serviceMenuTitle'), { reply_markup: serviceMenuKeyboard(lang) })
}

startHandler.command('start', async (ctx) => {
  await showMenu(ctx)
})

startHandler.callbackQuery(/^role:(CLIENT|SERVICE)$/, async (ctx) => {
  // Role is fixed once set (design §7); ignore taps on stale role keyboards.
  if (ctx.dbUser.role) {
    await ctx.answerCallbackQuery()
    return
  }
  const role = ctx.match![1] as 'CLIENT' | 'SERVICE'
  const updated = await db.user.update({
    where: { id: ctx.dbUser.id },
    data: { role },
  })
  ctx.dbUser = updated
  await ctx.answerCallbackQuery()
  const lang = (updated.language as Language) ?? 'ru'
  if (role === 'CLIENT') {
    await ctx.reply(t(lang, 'roleSetClient'))
  }
  await showMenu(ctx)
})
