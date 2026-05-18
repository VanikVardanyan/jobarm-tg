import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'hy' ? 'hy-AM' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} ֏`
}
