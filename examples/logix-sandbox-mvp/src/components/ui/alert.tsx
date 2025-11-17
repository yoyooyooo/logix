import * as React from 'react'

import { cn } from '../../lib/utils'

export const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100',
        className,
      )}
      {...props}
    />
  ),
)
Alert.displayName = 'Alert'

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn('mb-1 text-sm font-semibold leading-none', className)} {...props} />
  ),
)
AlertTitle.displayName = 'AlertTitle'

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-xs text-zinc-600 dark:text-zinc-300', className)} {...props} />
  ),
)
AlertDescription.displayName = 'AlertDescription'
