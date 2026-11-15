import * as React from "react"
import { cn } from "cn"

function SettingsSection({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="settings-section"
      className={cn(
        "grid gap-4 border-b pb-8 last-of-type:border-b-0 last-of-type:pb-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-10",
        className
      )}
      {...props}
    />
  )
}

function SettingsSectionHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="settings-section-header"
      className={cn("flex flex-col gap-1 lg:pt-1", className)}
      {...props}
    />
  )
}

function SettingsSectionTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="settings-section-title"
      className={cn("font-heading text-base font-medium", className)}
      {...props}
    />
  )
}

function SettingsSectionDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="settings-section-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function SettingsSectionContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="settings-section-content"
      className={cn("min-w-0", className)}
      {...props}
    />
  )
}

export {
  SettingsSection,
  SettingsSectionContent,
  SettingsSectionDescription,
  SettingsSectionHeader,
  SettingsSectionTitle,
}
