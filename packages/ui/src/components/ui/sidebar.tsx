import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { ChevronDownIcon, ChevronLeftIcon, MenuIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

const SIDEBAR_STORAGE_KEY = "sidebar:expanded"
const SIDEBAR_SHORTCUT_KEY = "b"
const SIDEBAR_SHORTCUT_LABEL =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘B" : "Ctrl+B"

type SidebarContextValue = {
  isExpanded: boolean
  toggleExpanded: () => void
  isMobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)
const SidebarCollapsedContext = React.createContext(false)
const SidebarSubmenuInMenuContext = React.createContext(false)

const sidebarItemClassName =
  "flex h-9 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium whitespace-nowrap text-sidebar-foreground/70 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 [&_svg]:size-4 [&_svg]:shrink-0"

const sidebarActiveItemClassName =
  "data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&_svg]:text-sidebar-primary"

function readStoredExpanded() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "false"
  } catch {
    return true
  }
}

function storeExpanded(isExpanded: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isExpanded))
    return true
  } catch {
    return false
  }
}

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider")
  return context
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = React.useState(readStoredExpanded)
  const [isMobileOpen, setMobileOpen] = React.useState(false)

  const toggleExpanded = () => setIsExpanded((expanded) => !expanded)

  React.useEffect(() => {
    storeExpanded(isExpanded)
  }, [isExpanded])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SIDEBAR_SHORTCUT_KEY || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      setIsExpanded((expanded) => !expanded)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <SidebarContext value={{ isExpanded, toggleExpanded, isMobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext>
  )
}

function SidebarToggle({ controls }: { controls: string }) {
  const { isExpanded, toggleExpanded } = useSidebar()
  const label = isExpanded ? "Recolher menu" : "Expandir menu"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-controls={controls}
            aria-expanded={isExpanded}
            onClick={toggleExpanded}
            className="absolute top-7 -right-3 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        }
      >
        <ChevronLeftIcon
          className={cn(
            "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
            !isExpanded && "rotate-180"
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
        <span className="text-background/60">{SIDEBAR_SHORTCUT_LABEL}</span>
      </TooltipContent>
    </Tooltip>
  )
}

function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  const { isExpanded, isMobileOpen, setMobileOpen } = useSidebar()
  const id = React.useId()

  return (
    <>
      <aside
        id={id}
        data-slot="sidebar"
        data-state={isExpanded ? "expanded" : "collapsed"}
        className={cn(
          "group/sidebar sticky top-0 z-20 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out motion-reduce:transition-none lg:flex",
          isExpanded ? "w-64" : "w-16",
          className
        )}
        {...props}
      >
        <SidebarCollapsedContext value={!isExpanded}>{children}</SidebarCollapsedContext>
        <SidebarToggle controls={id} />
      </aside>

      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 bg-sidebar p-0 text-sidebar-foreground lg:hidden"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal</SheetDescription>
          <div data-state="expanded" className="group/sidebar flex h-full flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex h-14 shrink-0 items-center overflow-hidden border-b px-3", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="sidebar-content"
      className={cn(
        "flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto px-3 py-4 group-data-[state=collapsed]/sidebar:gap-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn("flex shrink-0 flex-col gap-3 overflow-hidden border-t p-3", className)}
      {...props}
    />
  )
}

function SidebarGroup({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="sidebar-group"
      className={cn("group/sidebar-group flex flex-col gap-1", className)}
      {...props}
    >
      {label && (
        <span
          aria-hidden="true"
          className="flex h-6 items-center overflow-hidden px-3 text-xs font-medium whitespace-nowrap text-muted-foreground transition-all duration-200 motion-reduce:transition-none group-data-[state=collapsed]/sidebar:mx-3 group-data-[state=collapsed]/sidebar:my-1 group-data-[state=collapsed]/sidebar:h-px group-data-[state=collapsed]/sidebar:bg-sidebar-border group-data-[state=collapsed]/sidebar:px-0 group-data-[state=collapsed]/sidebar:text-transparent group-data-[state=collapsed]/sidebar:group-first/sidebar-group:hidden"
        >
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

function SidebarItem({
  icon,
  label,
  className,
  render,
  ...props
}: useRender.ComponentProps<"a"> & { icon: React.ReactNode; label: string }) {
  const isCollapsed = React.useContext(SidebarCollapsedContext)
  const { setMobileOpen } = useSidebar()

  const item = useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        className: cn(
          sidebarItemClassName,
          "aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-sidebar-accent-foreground aria-[current=page]:[&_svg]:text-sidebar-primary",
          className
        ),
        onClick: () => setMobileOpen(false),
        children: (
          <>
            {icon}
            <span className="truncate transition-opacity group-data-[state=collapsed]/sidebar:opacity-0">
              {label}
            </span>
          </>
        ),
      },
      props
    ),
    state: {
      slot: "sidebar-item",
    },
  })

  if (!isCollapsed) return item

  return (
    <Tooltip>
      <TooltipTrigger render={item} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function SidebarSubmenu({
  icon,
  label,
  isActive = false,
  children,
}: {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  children: React.ReactNode
}) {
  const isCollapsed = React.useContext(SidebarCollapsedContext)
  const [isOpen, setIsOpen] = React.useState(isActive)
  const [wasActive, setWasActive] = React.useState(isActive)

  if (isActive !== wasActive) {
    setWasActive(isActive)
    if (isActive) setIsOpen(true)
  }

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                data-active={isActive}
                aria-label={label}
                className={cn(
                  sidebarItemClassName,
                  sidebarActiveItemClassName,
                  "data-[active=true]:bg-sidebar-accent data-popup-open:bg-sidebar-accent"
                )}
              />
            }
          >
            {icon}
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <SidebarSubmenuInMenuContext value={true}>{children}</SidebarSubmenuInMenuContext>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <CollapsiblePrimitive.Root open={isOpen} onOpenChange={setIsOpen} data-slot="sidebar-submenu">
      <CollapsiblePrimitive.Trigger
        data-active={isActive}
        className={cn(sidebarItemClassName, sidebarActiveItemClassName)}
      >
        {icon}
        <span className="truncate">{label}</span>
        <ChevronDownIcon
          className={cn(
            "ml-auto transition-transform duration-200 motion-reduce:transition-none",
            !isOpen && "-rotate-90"
          )}
        />
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-in-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        <div className="mt-1 ml-5 flex flex-col gap-1 border-l border-sidebar-border pl-2">{children}</div>
      </CollapsiblePrimitive.Panel>
    </CollapsiblePrimitive.Root>
  )
}

function SidebarSubItem({
  icon,
  label,
  className,
  render,
  ...props
}: useRender.ComponentProps<"a"> & { icon: React.ReactNode; label: string }) {
  const isInMenu = React.useContext(SidebarSubmenuInMenuContext)
  const { setMobileOpen } = useSidebar()

  const content = (
    <>
      {icon}
      <span className="truncate">{label}</span>
    </>
  )

  const item = useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        className: cn(
          "flex h-8 items-center gap-2.5 rounded-lg px-3 text-sm whitespace-nowrap text-sidebar-foreground/70 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground aria-[current=page]:[&_svg]:text-sidebar-primary [&_svg]:size-4 [&_svg]:shrink-0",
          className
        ),
        onClick: () => setMobileOpen(false),
        children: content,
      },
      props
    ),
    state: {
      slot: "sidebar-sub-item",
    },
  })

  if (!isInMenu) return item

  return (
    <MenuPrimitive.LinkItem
      closeOnClick
      label={label}
      render={render}
      className={cn(
        "flex min-h-7 items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground aria-[current=page]:font-medium aria-[current=page]:[&_svg]:text-primary [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {content}
    </MenuPrimitive.LinkItem>
  )
}

function SidebarTrigger({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "children">) {
  const { setMobileOpen } = useSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Abrir menu"
      className={cn("lg:hidden", className)}
      onClick={() => setMobileOpen(true)}
      {...props}
    >
      <MenuIcon />
    </Button>
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarProvider,
  SidebarSubItem,
  SidebarSubmenu,
  SidebarTrigger,
  useSidebar,
}
