import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border border-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground border border-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none',
        outline:
          'bg-background text-foreground border border-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none',
        ghost: 'hover:bg-accent text-foreground border border-transparent',
        destructive:
          'bg-destructive text-destructive-foreground border border-destructive shadow-[2px_2px_0_0_var(--foreground)] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  },
)
Button.displayName = 'Button'

export { buttonVariants }
