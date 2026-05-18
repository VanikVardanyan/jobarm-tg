import { Bot } from 'grammy'
import { config } from '../config.js'
import { db } from '../db.js'

export const bot = new Bot(config.BOT_TOKEN)

bot.command('start', async (ctx) => {
  const from = ctx.from
  if (!from) return
  const telegramId = String(from.id)
  const chatId = String(ctx.chat?.id ?? from.id)
  try {
    await db.user.update({ where: { telegramId }, data: { chatId } })
  } catch {
    // Not registered yet — the Mini App auth flow will create the user.
  }
  await ctx.reply('🚗 Авто-сервис маркетплейс', {
    reply_markup: {
      inline_keyboard: [[{ text: '🚀 Открыть', web_app: { url: config.MINI_APP_URL } }]],
    },
  })
})

bot.catch((err) => {
  console.error('Bot error:', err)
})

export async function configureBotMenu(): Promise<void> {
  await bot.api.setChatMenuButton({
    menu_button: { type: 'web_app', text: 'Открыть', web_app: { url: config.MINI_APP_URL } },
  })
  await bot.api.setMyDescription(
    '🚗 Авто-сервис маркетплейс — найдите автосервис в Армении.\n\n' +
      '📲 Опишите проблему — получите предложения с ценой.\n' +
      '⭐ Рейтинги и отзывы. Всё внутри Telegram.'
  )
  await bot.api.setMyShortDescription('Автосервисы Армении')
}
