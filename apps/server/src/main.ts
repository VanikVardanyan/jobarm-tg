import { buildApp } from './app.js'
import { config } from './config.js'
import { bot, configureBotMenu } from './bot/bot.js'
import { initNotifications } from './bot/notifications.js'

const app = buildApp()

initNotifications(bot)

app.listen({ port: config.PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})

bot.launch().catch((err) => {
  app.log.error({ err }, 'Bot launch failed')
  process.exit(1)
})

configureBotMenu().catch((err) => {
  app.log.warn({ err }, 'Failed to configure bot menu button')
})

const shutdown = async (signal: string) => {
  bot.stop(signal)
  await app.close()
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
