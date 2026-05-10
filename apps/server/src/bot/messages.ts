export function escapeMarkdown(text: string | number): string {
  if (typeof text === 'number') return String(text)
  return text.replace(/[*_`[\]]/g, (ch) => `\\${ch}`)
}

export type Language = 'hy' | 'ru' | 'en'

export type MessageKey =
  | 'newJob'
  | 'newApplication'
  | 'masterSelected'
  | 'masterMarkedDone'
  | 'customerConfirmed'
  | 'newReview'

type MessageParams = Record<string, string | number>

const templates: Record<Language, Record<MessageKey, (p: MessageParams) => string>> = {
  hy: {
    newJob: (p) =>
      `🔔 *Նոր առաջադրանք!*\n\n📂 ${escapeMarkdown(p.category)}\n📝 ${escapeMarkdown(p.description)}\n💰 ${p.budget} ֏\n📅 ${p.dateFrom} — ${p.dateTo}`,
    newApplication: (p) =>
      `👨‍🔧 *${escapeMarkdown(p.masterName)}*-ը արձագանքել է ձեր պատվերին․\n_${escapeMarkdown(p.jobDescription)}_`,
    masterSelected: (p) =>
      `✅ Պատվիրատուն ընտրել է Ձեզ։\nՊատվեր․ _${escapeMarkdown(p.jobDescription)}_\nԿապ հաստատեք պատվիրատուի հետ։`,
    masterMarkedDone: (p) =>
      `🏁 Վարպետը նշել է պատվերը որպես կատարված․\n_${escapeMarkdown(p.jobDescription)}_\nՀաստատեք ավարտը հավելվածում։`,
    customerConfirmed: (p) =>
      `🎉 Պատվերը ավարտված է!\n_${escapeMarkdown(p.jobDescription)}_\nՊատվիրատուն հաստատել է կատարումը։`,
    newReview: (p) =>
      `⭐ Նոր կարծիք․ *${p.rating}/5*${p.comment ? `\n_${escapeMarkdown(p.comment)}_` : ''}`,
  },
  ru: {
    newJob: (p) =>
      `🔔 *Новая заявка!*\n\n📂 ${escapeMarkdown(p.category)}\n📝 ${escapeMarkdown(p.description)}\n💰 ${p.budget} ֏\n📅 ${p.dateFrom} — ${p.dateTo}`,
    newApplication: (p) =>
      `👨‍🔧 *${escapeMarkdown(p.masterName)}* откликнулся на вашу заявку:\n_${escapeMarkdown(p.jobDescription)}_`,
    masterSelected: (p) =>
      `✅ Заказчик выбрал вас!\nЗаявка: _${escapeMarkdown(p.jobDescription)}_\nСвяжитесь с заказчиком.`,
    masterMarkedDone: (p) =>
      `🏁 Мастер отметил работу как выполненную:\n_${escapeMarkdown(p.jobDescription)}_\nПодтвердите завершение в приложении.`,
    customerConfirmed: (p) =>
      `🎉 Работа завершена!\n_${escapeMarkdown(p.jobDescription)}_\nЗаказчик подтвердил выполнение.`,
    newReview: (p) =>
      `⭐ Новый отзыв: *${p.rating}/5*${p.comment ? `\n_${escapeMarkdown(p.comment)}_` : ''}`,
  },
  en: {
    newJob: (p) =>
      `🔔 *New job!*\n\n📂 ${escapeMarkdown(p.category)}\n📝 ${escapeMarkdown(p.description)}\n💰 ${p.budget} ֏\n📅 ${p.dateFrom} — ${p.dateTo}`,
    newApplication: (p) =>
      `👨‍🔧 *${escapeMarkdown(p.masterName)}* applied to your job:\n_${escapeMarkdown(p.jobDescription)}_`,
    masterSelected: (p) =>
      `✅ You were selected!\nJob: _${escapeMarkdown(p.jobDescription)}_\nContact the customer.`,
    masterMarkedDone: (p) =>
      `🏁 Master marked the job as done:\n_${escapeMarkdown(p.jobDescription)}_\nPlease confirm completion in the app.`,
    customerConfirmed: (p) =>
      `🎉 Job completed!\n_${escapeMarkdown(p.jobDescription)}_\nThe customer confirmed.`,
    newReview: (p) =>
      `⭐ New review: *${p.rating}/5*${p.comment ? `\n_${escapeMarkdown(p.comment)}_` : ''}`,
  },
}

export function buildMessage(lang: string, key: MessageKey, params: MessageParams): string {
  const langTemplates = templates[lang as Language] ?? templates.hy
  return langTemplates[key](params)
}
