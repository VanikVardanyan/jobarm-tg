import type { Bot } from 'grammy'
import { db } from '../db.js'
import { config } from '../config.js'

let _bot: Bot | null = null

export function initNotifications(bot: Bot): void {
  _bot = bot
}

// Escape user-supplied text for Telegram legacy Markdown.
function escapeMd(text: string): string {
  return text.replace(/[*_`[\]]/g, (ch) => `\\${ch}`)
}

export async function notify(
  telegramId: string,
  text: string,
  opts: { requestId?: string; buttonLabel?: string } = {}
): Promise<void> {
  if (!_bot) return
  try {
    const user = await db.user.findUnique({
      where: { telegramId },
      select: { chatId: true },
    })
    if (!user?.chatId) return
    const url = opts.requestId
      ? `${config.MINI_APP_URL}?startapp=request_${opts.requestId}`
      : config.MINI_APP_URL
    await _bot.api.sendMessage(user.chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: opts.buttonLabel ?? 'Открыть', web_app: { url } }]],
      },
    })
  } catch {
    // User may have blocked the bot — ignore.
  }
}

export async function notifyAdmins(text: string): Promise<void> {
  if (!_bot || config.ADMIN_TELEGRAM_IDS.length === 0) return
  await Promise.all(
    config.ADMIN_TELEGRAM_IDS.map((id) =>
      _bot!.api.sendMessage(id, text, { parse_mode: 'Markdown' }).catch(() => undefined)
    )
  )
}

export async function notifyAdminsNewUser(userId: string): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        username: true,
        telegramId: true,
        phoneNumber: true,
        language: true,
        role: true,
      },
    })
    if (!user) return
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User'
    const text =
      `🆕 *Новый пользователь*\n\n` +
      `👤 ${escapeMd(name)}\n` +
      (user.username ? `🆔 @${escapeMd(user.username)}\n` : '') +
      (user.phoneNumber ? `📞 ${escapeMd(user.phoneNumber)}\n` : '') +
      `🌐 ${user.language} · ${user.role ?? 'роль не выбрана'}\n` +
      `tg id: \`${user.telegramId}\``
    await notifyAdmins(text)
  } catch {
    // Fire-and-forget (called via `void` in auth.ts) — never throw.
  }
}
