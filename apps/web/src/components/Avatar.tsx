import { cn } from '@/lib/utils'

const COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
]

function colorFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

interface Props {
  url?: string | null
  name: string
  size?: number
  className?: string
}

export function Avatar({ url, name, size = 40, className }: Props) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const style = { width: size, height: size, fontSize: size * 0.4 }

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={style}
        className={cn('rounded-full object-cover flex-shrink-0', className)}
      />
    )
  }

  return (
    <div
      style={style}
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        colorFor(name || '?'),
        className
      )}
    >
      {initials || '?'}
    </div>
  )
}
