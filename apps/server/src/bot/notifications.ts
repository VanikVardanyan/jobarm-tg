import type { Telegraf } from 'telegraf'
import { db } from '../db.js'
import { config } from '../config.js'
import { buildMessage } from './messages.js'

let _bot: Telegraf | null = null

export function initNotifications(bot: Telegraf) {
  _bot = bot
}

async function send(
  telegramId: string,
  text: string,
  opts: {
    jobId?: string
    buttonLabel?: string
    kind?: string
    title?: string
    body?: string
  } = {}
): Promise<void> {
  if (!_bot) return
  try {
    const user = await db.user.findUnique({
      where: { telegramId },
      select: { id: true, chatId: true },
    })
    if (!user) return

    if (opts.kind && opts.title) {
      await db.notification.create({
        data: {
          userId: user.id,
          kind: opts.kind,
          title: opts.title,
          body: opts.body ?? text.slice(0, 200),
          jobId: opts.jobId ?? null,
        },
      })
    }

    if (!user.chatId) return
    const url = opts.jobId
      ? `${config.MINI_APP_URL}?startapp=job_${opts.jobId}`
      : config.MINI_APP_URL
    await _bot.telegram.sendMessage(user.chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: opts.buttonLabel ?? 'Բացել', web_app: { url } }]],
      },
    })
  } catch {
    // Silently ignore: user may have blocked the bot
  }
}

export async function notifyMastersNewJob(jobId: string): Promise<void> {
  if (!_bot) return
  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { category: true },
    })
    if (!job) return

    const masters = await db.user.findMany({
      where: {
        isMaster: true,
        categories: { some: { categoryId: job.categoryId } },
        chatId: { not: null },
      },
      select: { telegramId: true, language: true },
    })

    await Promise.all(
      masters.map((master) => {
        const lang = master.language ?? 'hy'
        const locale = lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : 'hy-AM'
        const dateFrom = job.dateFrom.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
        const dateTo = job.dateTo.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
        const category =
          lang === 'en' ? job.category.nameEn : lang === 'hy' ? job.category.nameHy : job.category.nameRu
        const text = buildMessage(lang, 'newJob', {
          category,
          description: job.description.slice(0, 100),
          budget: job.budget,
          dateFrom,
          dateTo,
        })
        return send(master.telegramId, text, { jobId: job.id, kind: 'new_job', title: 'Նոր առաջադրանք', body: `${category} · ${job.budget} ֏` })
      })
    )
  } catch {
    // Fire-and-forget: silently ignore errors
  }
}

export async function notifyCustomerNewApplication(jobId: string, masterId: string): Promise<void> {
  if (!_bot) return
  try {
    const [job, master] = await Promise.all([
      db.job.findUnique({ where: { id: jobId }, select: { customerId: true, description: true } }),
      db.user.findUnique({ where: { id: masterId }, select: { name: true } }),
    ])
    if (!job || !master) return

    const customer = await db.user.findUnique({
      where: { id: job.customerId },
      select: { telegramId: true, language: true },
    })
    if (!customer) return

    const lang = customer.language ?? 'hy'
    const text = buildMessage(lang, 'newApplication', {
      masterName: master.name,
      jobDescription: job.description.slice(0, 100),
    })
    await send(customer.telegramId, text, { jobId, kind: 'new_application', title: 'Նոր արձագանք', body: master.name })
  } catch {
    // Fire-and-forget: silently ignore errors
  }
}

export async function notifyMasterSelected(jobId: string, masterId: string): Promise<void> {
  if (!_bot) return
  try {
    const [job, master] = await Promise.all([
      db.job.findUnique({ where: { id: jobId }, select: { description: true } }),
      db.user.findUnique({ where: { id: masterId }, select: { telegramId: true, language: true } }),
    ])
    if (!job || !master) return

    const lang = master.language ?? 'hy'
    const text = buildMessage(lang, 'masterSelected', {
      jobDescription: job.description.slice(0, 100),
    })
    await send(master.telegramId, text, { jobId, kind: 'master_selected', title: 'Ձեզ ընտրել են', body: job.description.slice(0, 100) })
  } catch {
    // Fire-and-forget: silently ignore errors
  }
}

export async function notifyMasterJobDone(jobId: string): Promise<void> {
  if (!_bot) return
  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { description: true, customerId: true },
    })
    if (!job) return

    const customer = await db.user.findUnique({
      where: { id: job.customerId },
      select: { telegramId: true, language: true },
    })
    if (!customer) return

    const lang = customer.language ?? 'hy'
    const text = buildMessage(lang, 'masterMarkedDone', {
      jobDescription: job.description.slice(0, 100),
    })
    await send(customer.telegramId, text, { jobId, kind: 'master_marked_done', title: 'Վարպետը ավարտել է', body: job.description.slice(0, 100) })
  } catch {
    // Fire-and-forget: silently ignore errors
  }
}

export async function notifyJobCompleted(jobId: string, masterId: string): Promise<void> {
  if (!_bot) return
  try {
    const [job, master] = await Promise.all([
      db.job.findUnique({ where: { id: jobId }, select: { description: true } }),
      db.user.findUnique({ where: { id: masterId }, select: { telegramId: true, language: true } }),
    ])
    if (!job || !master) return

    const lang = master.language ?? 'hy'
    const text = buildMessage(lang, 'customerConfirmed', {
      jobDescription: job.description.slice(0, 100),
    })
    await send(master.telegramId, text, { jobId, kind: 'job_completed', title: 'Պատվերը ավարտված է', body: job.description.slice(0, 100) })
  } catch {
    // Fire-and-forget: silently ignore errors
  }
}

export async function notifyAdminsNewUser(userId: string): Promise<void> {
  if (!_bot || config.ADMIN_TELEGRAM_IDS.length === 0) return
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        username: true,
        telegramId: true,
        phone: true,
        language: true,
        isMaster: true,
      },
    })
    if (!user) return

    const text =
      `🆕 *Նոր օգտատեր*\n\n` +
      `👤 ${user.name}\n` +
      (user.username ? `🆔 @${user.username}\n` : '') +
      (user.phone ? `📞 ${user.phone}\n` : '') +
      `🌐 ${user.language} · ${user.isMaster ? '🛠 master' : '👤 customer'}\n` +
      `tg id: \`${user.telegramId}\``

    await Promise.all(
      config.ADMIN_TELEGRAM_IDS.map((tgId) =>
        _bot!.telegram
          .sendMessage(tgId, text, { parse_mode: 'Markdown' })
          .catch(() => undefined)
      )
    )
  } catch {
    // silent
  }
}

export async function notifyMasterNewReview(
  masterId: string,
  rating: number,
  comment?: string | null
): Promise<void> {
  if (!_bot) return
  try {
    const master = await db.user.findUnique({
      where: { id: masterId },
      select: { telegramId: true, language: true },
    })
    if (!master) return

    const lang = master.language ?? 'hy'
    const text = buildMessage(lang, 'newReview', {
      rating,
      comment: comment ?? '',
    })
    await send(master.telegramId, text, { kind: 'new_review', title: 'Նոր կարծիք', body: `${rating}/5${comment ? `: ${comment}` : ''}` })
  } catch {
    // Fire-and-forget: silently ignore errors
  }
}
