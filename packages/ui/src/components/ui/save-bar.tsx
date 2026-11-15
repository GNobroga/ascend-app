import * as React from "react"
import { cn } from "cn"

function SaveBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="region"
      data-slot="save-bar"
      className={cn(
        "sticky bottom-4 z-20 flex animate-in flex-col gap-3 rounded-2xl border bg-popover/95 p-3 pl-4 text-sm text-popover-foreground shadow-lg backdrop-blur-md duration-200 fade-in-0 slide-in-from-bottom-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    />
  )
}

function SaveBarMessage({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="save-bar-message"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function SaveBarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="save-bar-actions"
      className={cn("flex items-center justify-end gap-2", className)}
      {...props}
    />
  )
}

export { SaveBar, SaveBarActions, SaveBarMessage }
