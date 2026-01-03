import type * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border border-foreground px-2 py-0.5 text-xs font-bold text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground border-foreground',
        outline: 'bg-background border-foreground',
        info: 'bg-info text-info-foreground border-foreground',
        warning: 'bg-warning text-warning-foreground border-foreground',
        success: 'bg-success text-success-foreground border-foreground',
        danger: 'bg-destructive text-destructive-foreground border-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />
}

export { badgeVariants }
