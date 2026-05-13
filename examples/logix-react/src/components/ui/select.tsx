"use client"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

function Select<Value>({
  modal = false,
  ...props
}: SelectPrimitive.Root.Props<Value>) {
  return <SelectPrimitive.Root data-slot="select" modal={modal} {...props} />
}

function SelectTrigger({
  className,
  children,
  ...props
}: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "inline-flex h-7 min-w-0 items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground shadow-xs outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[popup-open]:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDownIcon className="size-3.5 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectContent({
  className,
  children,
  align = "start",
  side,
  sideOffset = 4,
  ...props
}: SelectPrimitive.Popup.Props & Pick<SelectPrimitive.Positioner.Props, "align" | "side"> & { readonly sideOffset?: number }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner align={align} side={side} sideOffset={sideOffset}>
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "z-50 max-h-72 min-w-[var(--anchor-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none",
            className
          )}
          {...props}
        >
          <SelectPrimitive.List className="max-h-72 overflow-y-auto p-1">
            {children}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-7 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 pr-7 text-xs outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="min-w-0 truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
        <CheckIcon className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
