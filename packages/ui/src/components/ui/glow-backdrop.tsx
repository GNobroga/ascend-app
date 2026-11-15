import * as React from "react"
import { cn } from "cn"

function GlowBackdrop({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="glow-backdrop"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      {...props}
    >
      <div className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_at_top,black_20%,transparent_65%)]" />
      <div className="absolute -top-48 left-1/2 h-[28rem] w-[min(56rem,140%)] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
    </div>
  )
}

export { GlowBackdrop }
