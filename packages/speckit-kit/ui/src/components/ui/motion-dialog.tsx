'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils'

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

interface MotionDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  children: React.ReactNode
  className?: string
  overlayClassName?: string
  motionProps?: React.ComponentProps<typeof motion.div>
}

const MotionDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  MotionDialogContentProps
>(({ className, children, overlayClassName, motionProps, ...props }, ref) => (
  <DialogPortal forceMount>
    <DialogPrimitive.Overlay asChild>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          overlayClassName,
        )}
      />
    </DialogPrimitive.Overlay>
    <DialogPrimitive.Content asChild ref={ref} {...props}>
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        {...motionProps}
        className={cn(
          'fixed right-0 top-0 z-50 h-screen w-screen bg-background shadow-lg outline-none sm:max-w-md',
          className,
        )}
      >
        {children}
      </motion.div>
    </DialogPrimitive.Content>
  </DialogPortal>
))
MotionDialogContent.displayName = DialogPrimitive.Content.displayName

// Wrapper to handle AnimatePresence internally if we want to pass `open` state
// But Radix Dialog handles state. The trick is: Radix unmounts content when closed.
// To animate exit, we need ForceMount + AnimatePresence OUTSIDE or wrapping the content.
//
// Correct pattern with Radix + Framer Motion:
// Render Dialog.Root open={true} conditionally? No.
// Render Dialog.Root open={isOpen}.
// Inside Portal:
// <AnimatePresence>
//   {isOpen && (
//      <DialogPrimitive.Content forceMount ... >
//        <motion.div ... exit={{...}} />
//      </DialogPrimitive.Content>
//   )}
// </AnimatePresence>
//
// BUT Radix UI's Dialog.Content is what provides the focus trap. If we simple forceMount, it might trap focus even when hidden.
//
// Actually, the recommended way is using `forceMount` on Portal or Content, and using `AnimatePresence` to conditionally render the inner motion component?
// No, standard way:
// <Dialog.Root open={open} onOpenChange={onOpenChange}>
//   <AnimatePresence>
//     {open && (
//       <Dialog.Portal forceMount>
//         <Dialog.Overlay asChild> <motion.div ... /> </Dialog.Overlay>
//         <Dialog.Content asChild> <motion.div ... /> </Dialog.Content>
//       </Dialog.Portal>
//     )}
//   </AnimatePresence>
// </Dialog.Root>

export function MotionDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>{open && children}</AnimatePresence>
    </Dialog>
  )
}

export { Dialog, DialogTrigger, MotionDialogContent, DialogClose }
