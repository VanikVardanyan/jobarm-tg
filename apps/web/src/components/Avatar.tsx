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

function PersonGlyph({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size * 0.7}
      height={size * 0.7}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 12.6c2.43 0 4.4-1.97 4.4-4.4S14.43 3.8 12 3.8 7.6 5.77 7.6 8.2s1.97 4.4 4.4 4.4Zm0 2.2c-3.13 0-9.4 1.57-9.4 4.7v1.7c0 .39.31.7.7.7h17.4c.39 0 .7-.31.7-.7v-1.7c0-3.13-6.27-4.7-9.4-4.7Z" />
    </svg>
  )
}

interface Props {
  url?: string | null
  name: string
  size?: number
  className?: string
}

export function Avatar({ url, name, size = 40, className }: Props) {
  const style = { width: size, height: size }

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={style}
        className={cn('rounded-full object-cover flex-shrink-0 bg-secondary', className)}
      />
    )
  }

  return (
    <div
      style={style}
      className={cn(
        'rounded-full flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 text-zinc-500 dark:text-zinc-300 flex-shrink-0',
        className
      )}
    >
      <PersonGlyph size={size} />
    </div>
  )
}
