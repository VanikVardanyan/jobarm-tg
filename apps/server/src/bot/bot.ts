import { Telegraf, type Context } from 'telegraf'
import { config } from '../config.js'
import { db } from '../db.js'

export const bot: Telegraf<Context> = new Telegraf(config.BOT_TOKEN)

bot.start(async (ctx) => {
  if (!ctx.from) return

  const telegramId = String(ctx.from.id)
  const chatId = String(ctx.chat.id)

  try {
    await db.user.update({
      where: { telegramId },
      data: { chatId },
    })
  } catch {
    // User not registered yet — they'll register via the Mini App
  }

  await ctx.reply('👇', {
    reply_markup: {
      inline_keyboard: [[{ text: '🚀 Սկսել', web_app: { url: config.MINI_APP_URL } }]],
    },
  })
})

bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType} (user ${ctx.from?.id}):`, err)
})

export async function configureBotMenu() {
  await bot.telegram.setChatMenuButton({
    menuButton: {
      type: 'web_app',
      text: 'Սկսել',
      web_app: { url: config.MINI_APP_URL },
    },
  })

  await bot.telegram.setMyDescription(
    '🚀 JobArm — վարպետներ և պատվիրատուներ մեկ հարթակում։\n\n' +
      '📲 Տեղադրեք առաջադրանքներ կամ գտեք աշխատանք՝ առանց ավելորդ քայլերի։\n' +
      '⭐ Վարկանիշներ, կարծիքներ և ստուգված վարպետներ։\n' +
      '🔒 Ամեն ինչ՝ Telegram-ի ներսում։'
  )

  await bot.telegram.setMyShortDescription(
    'Աշխատանք և վարպետներ Հայաստանում'
  )
}
