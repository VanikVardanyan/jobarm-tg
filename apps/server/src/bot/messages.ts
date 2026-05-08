type Language = 'ru' | 'en'

type MessageKey =
  | 'newJob'
  | 'newApplication'
  | 'masterSelected'
  | 'masterMarkedDone'
  | 'customerConfirmed'
  | 'newReview'

type MessageParams = Record<string, string | number>

const templates: Record<Language, Record<MessageKey, (p: MessageParams) => string>> = {
  ru: {
    newJob: (p) =>
      `🔔 *Новая заявка!*\n\n📂 ${p.category}\n📝 ${p.description}\n💰 ${p.budget} AMD\n📅 ${p.dateFrom} — ${p.dateTo}`,
    newApplication: (p) =>
      `👨‍🔧 *${p.masterName}* откликнулся на вашу заявку:\n_${p.jobDescription}_`,
    masterSelected: (p) =>
      `✅ Заказчик выбрал вас!\nЗаявка: _${p.jobDescription}_\nСвяжитесь с заказчиком.`,
    masterMarkedDone: (p) =>
      `🏁 Мастер отметил работу как выполненную:\n_${p.jobDescription}_\nПодтвердите завершение в приложении.`,
    customerConfirmed: (p) =>
      `🎉 Работа завершена!\n_${p.jobDescription}_\nЗаказчик подтвердил выполнение.`,
    newReview: (p) =>
      `⭐ Новый отзыв: *${p.rating}/5*${p.comment ? `\n_${p.comment}_` : ''}`,
  },
  en: {
    newJob: (p) =>
      `🔔 *New job!*\n\n📂 ${p.category}\n📝 ${p.description}\n💰 ${p.budget} AMD\n📅 ${p.dateFrom} — ${p.dateTo}`,
    newApplication: (p) =>
      `👨‍🔧 *${p.masterName}* applied to your job:\n_${p.jobDescription}_`,
    masterSelected: (p) =>
      `✅ You were selected!\nJob: _${p.jobDescription}_\nContact the customer.`,
    masterMarkedDone: (p) =>
      `🏁 Master marked the job as done:\n_${p.jobDescription}_\nPlease confirm completion in the app.`,
    customerConfirmed: (p) =>
      `🎉 Job completed!\n_${p.jobDescription}_\nThe customer confirmed.`,
    newReview: (p) =>
      `⭐ New review: *${p.rating}/5*${p.comment ? `\n_${p.comment}_` : ''}`,
  },
}

export function buildMessage(lang: Language, key: MessageKey, params: MessageParams): string {
  const langTemplates = templates[lang] ?? templates.ru
  return langTemplates[key](params)
}
