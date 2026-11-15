import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"
import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

function ThemeSwitch({
  className,
  ...props
}: Omit<SwitchPrimitive.Root.Props, "checked" | "defaultChecked" | "onCheckedChange">) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <SwitchPrimitive.Root
      data-slot="theme-switch"
      aria-label="Tema escuro"
      checked={isDark}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      className={cn(
        "relative inline-flex h-7 w-[3.25rem] shrink-0 cursor-pointer items-center rounded-full border bg-muted p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="flex size-6 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform duration-200 ease-in-out motion-reduce:transition-none data-checked:translate-x-[1.375rem]">
        {isDark ? <MoonIcon className="size-3.5" /> : <SunIcon className="size-3.5" />}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { ThemeSwitch }
