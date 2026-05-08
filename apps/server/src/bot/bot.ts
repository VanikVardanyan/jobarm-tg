import { Telegraf } from 'telegraf'
import { config } from '../config.js'
import { db } from '../db.js'

export const bot = new Telegraf(config.BOT_TOKEN)

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

  await ctx.reply(
    '👋 Добро пожаловать в JobArm!\nНайдите мастера или станьте мастером.',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛠 Открыть JobArm', web_app: { url: config.MINI_APP_URL } }],
        ],
      },
    }
  )
})

bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType} (user ${ctx.from?.id}):`, err)
})
