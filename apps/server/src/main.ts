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

// Long polling. A bad/placeholder BOT_TOKEN must not crash the HTTP server.
bot
  .start({ onStart: () => app.log.info('Bot started (long polling)') })
  .catch((err) => app.log.warn({ err }, 'Bot failed to start'))

configureBotMenu().catch((err) => {
  app.log.warn({ err }, 'Failed to configure bot menu')
})

const shutdown = async () => {
  await bot.stop().catch(() => undefined)
  await app.close()
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
