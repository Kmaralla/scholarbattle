import { AVATARS } from './avatars'
import { cn } from '@/lib/utils'

export function UserAvatar({
  username,
  avatarUrl,
  size = 'md',
  className,
}: {
  username: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const avatar = AVATARS.find(a => a.id === avatarUrl)
  const sizeClasses = {
    sm: 'w-9 h-9 text-xl',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-12 h-12 text-3xl',
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center flex-shrink-0',
      avatar ? 'bg-white/10' : 'bg-indigo-500/20',
      sizeClasses[size],
      className,
    )}>
      {avatar
        ? <span>{avatar.emoji}</span>
        : <span className="font-bold text-indigo-300 text-sm">{(username?.[0] ?? '?').toUpperCase()}</span>
      }
    </div>
  )
}
