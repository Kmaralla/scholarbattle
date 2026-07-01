import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
          variant === 'secondary' && 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
          variant === 'ghost' && 'text-white/60 hover:bg-white/10',
          variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-6 py-3 text-base',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
