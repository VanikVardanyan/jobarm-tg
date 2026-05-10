import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Telegraf, type Context } from 'telegraf'
import { config } from '../config.js'
import { db } from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const welcomeImage = readFileSync(join(__dirname, '../../assets/welcome.png'))

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

  await ctx.replyWithPhoto(
    { source: welcomeImage },
    {
      caption: '🚀 Վարպետներ և պատվիրատուներ՝ մեկ հարթակում։\n📲 Տեղադրեք առաջադրանքներ կամ գտեք աշխատանք՝ առանց ավելորդ քայլերի։',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛠 Բացել JobArm', web_app: { url: config.MINI_APP_URL } }],
        ],
      },
    }
  )
})

bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType} (user ${ctx.from?.id}):`, err)
})

export async function configureBotMenu() {
  await bot.telegram.setChatMenuButton({
    menuButton: {
      type: 'web_app',
      text: 'Բացել',
      web_app: { url: config.MINI_APP_URL },
    },
  })
}
