import { buildApp } from './app.js'
import { config } from './config.js'
import { bot } from './bot/bot.js'
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
  console.error('Bot launch failed:', err)
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
