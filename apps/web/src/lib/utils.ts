import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatBudget(amount: number, lang = 'ru'): string {
  if (!amount) {
    return lang === 'hy' ? 'Պայմանավորվող' : lang === 'en' ? 'Negotiable' : 'Договорная'
  }
  return `${amount.toLocaleString('ru-RU')} ֏`
}
