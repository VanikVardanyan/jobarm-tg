import type { Telegraf } from 'telegraf'
import { db } from '../db.js'
import { buildMessage } from './messages.js'

let _bot: Telegraf | null = null

export function initNotifications(bot: Telegraf) {
  _bot = bot
}

async function send(telegramId: string, text: string): Promise<void> {
  if (!_bot) return
  try {
    const user = await db.user.findUnique({
      where: { telegramId },
      select: { chatId: true },
    })
    if (!user?.chatId) return
    await _bot.telegram.sendMessage(user.chatId, text, { parse_mode: 'Markdown' })
  } catch {
    // Silently ignore: user may have blocked the bot
  }
}

async function getLang(userId: string): Promise<'ru' | 'en'> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { language: true } })
  return (user?.language as 'ru' | 'en') ?? 'ru'
}

export async function notifyMastersNewJob(jobId: string): Promise<void> {
  if (!_bot) return
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

  const dateFrom = job.dateFrom.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const dateTo = job.dateTo.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  await Promise.all(
    masters.map((master) => {
      const lang = (master.language as 'ru' | 'en') ?? 'ru'
      const category = lang === 'en' ? job.category.nameEn : job.category.nameRu
      const text = buildMessage(lang, 'newJob', {
        category,
        description: job.description.slice(0, 100),
        budget: job.budget,
        dateFrom,
        dateTo,
      })
      return send(master.telegramId, text)
    })
  )
}

export async function notifyCustomerNewApplication(jobId: string, masterId: string): Promise<void> {
  if (!_bot) return
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

  const lang = (customer.language as 'ru' | 'en') ?? 'ru'
  const text = buildMessage(lang, 'newApplication', {
    masterName: master.name,
    jobDescription: job.description.slice(0, 80),
  })
  await send(customer.telegramId, text)
}

export async function notifyMasterSelected(jobId: string, masterId: string): Promise<void> {
  if (!_bot) return
  const job = await db.job.findUnique({ where: { id: jobId }, select: { description: true } })
  const master = await db.user.findUnique({
    where: { id: masterId },
    select: { telegramId: true, language: true },
  })
  if (!job || !master) return

  const lang = (master.language as 'ru' | 'en') ?? 'ru'
  const text = buildMessage(lang, 'masterSelected', {
    jobDescription: job.description.slice(0, 80),
  })
  await send(master.telegramId, text)
}

export async function notifyMasterJobDone(jobId: string): Promise<void> {
  if (!_bot) return
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

  const lang = (customer.language as 'ru' | 'en') ?? 'ru'
  const text = buildMessage(lang, 'masterMarkedDone', {
    jobDescription: job.description.slice(0, 80),
  })
  await send(customer.telegramId, text)
}

export async function notifyJobCompleted(jobId: string, masterId: string): Promise<void> {
  if (!_bot) return
  const job = await db.job.findUnique({ where: { id: jobId }, select: { description: true } })
  const master = await db.user.findUnique({
    where: { id: masterId },
    select: { telegramId: true, language: true },
  })
  if (!job || !master) return

  const lang = (master.language as 'ru' | 'en') ?? 'ru'
  const text = buildMessage(lang, 'customerConfirmed', {
    jobDescription: job.description.slice(0, 80),
  })
  await send(master.telegramId, text)
}

export async function notifyMasterNewReview(
  masterId: string,
  rating: number,
  comment?: string | null
): Promise<void> {
  if (!_bot) return
  const master = await db.user.findUnique({
    where: { id: masterId },
    select: { telegramId: true, language: true },
  })
  if (!master) return

  const lang = (master.language as 'ru' | 'en') ?? 'ru'
  const text = buildMessage(lang, 'newReview', {
    rating,
    comment: comment ?? '',
  })
  await send(master.telegramId, text)
}
