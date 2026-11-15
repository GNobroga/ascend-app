import { ThemeProvider as NextThemesProvider } from "next-themes"

function ThemeProvider({
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    />
  )
}

export { ThemeProvider }
export { useTheme } from "next-themes"
