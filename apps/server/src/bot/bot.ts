import { Bot, session } from 'grammy'
import { conversations, createConversation } from '@grammyjs/conversations'
import { config } from '../config.js'
import type { BotContext } from './context.js'
import { redisStorage } from './session.js'
import { loadUser, banGate } from './middleware.js'
import { startHandler, showMenu } from './handlers/start.js'
import { miscHandler } from './handlers/misc.js'
import { registerService, REGISTER_SERVICE } from './conversations/registerService.js'
import { createRequest, CREATE_REQUEST } from './conversations/createRequest.js'

export const bot = new Bot<BotContext>(config.BOT_TOKEN)

// Session (Redis) is required by the conversations plugin.
bot.use(
  session({
    initial: () => ({}),
    storage: redisStorage(),
  })
)

// loadUser/banGate must run before conversations so ctx.dbUser exists inside them.
bot.use(loadUser)
bot.use(banGate)

bot.use(conversations())
bot.use(createConversation(registerService, REGISTER_SERVICE))
bot.use(createConversation(createRequest, CREATE_REQUEST))

// Enter the registration wizard from the service "register" button.
bot.callbackQuery('menu:register_service', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.conversation.enter(REGISTER_SERVICE)
})

bot.callbackQuery('menu:create_request', async (ctx) => {
  await ctx.answerCallbackQuery()
  await ctx.conversation.enter(CREATE_REQUEST)
})

bot.use(startHandler)
bot.use(miscHandler)

// Fallback: any other message → show the menu.
bot.on('message', async (ctx) => {
  await showMenu(ctx)
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
  await bot.api.setMyCommands([
    { command: 'start', description: 'Начало / меню' },
    { command: 'language', description: 'Сменить язык' },
    { command: 'cancel', description: 'Отменить действие' },
    { command: 'help', description: 'Помощь' },
  ])
}
