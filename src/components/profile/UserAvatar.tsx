import { AVATARS } from './avatars'
import { cn } from '@/lib/utils'
import { FRAME_MAP } from '@/lib/frames'

export function UserAvatar({
  username,
  avatarUrl,
  frameId,
  size = 'md',
  className,
}: {
  username: string
  avatarUrl?: string | null
  frameId?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const avatar = AVATARS.find(a => a.id === avatarUrl)
  const frame = frameId ? FRAME_MAP[frameId] : undefined
  const sizeClasses = {
    sm: 'w-9 h-9 text-xl',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-12 h-12 text-3xl',
  }

  const circle = (
    <div className={cn(
      'rounded-full flex items-center justify-center flex-shrink-0',
      avatar ? 'bg-white/10' : 'bg-indigo-500/20',
      sizeClasses[size],
      frame && frame.id !== 'none' && !frame.special && frame.border,
      frame?.glow,
      !frame?.special && className,
    )}>
      {avatar
        ? <span>{avatar.emoji}</span>
        : <span className="font-bold text-indigo-300 text-sm">{(username?.[0] ?? '?').toUpperCase()}</span>
      }
    </div>
  )

  if (frame?.special === 'rainbow') {
    return (
      <div className={cn('rounded-full p-[3px] flex-shrink-0 frame-prism', className)}>
        {circle}
      </div>
    )
  }

  return circle
}
