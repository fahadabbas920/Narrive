"use client"

import { Menu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

const DropdownMenu = Menu.Root
const DropdownMenuTrigger = Menu.Trigger

function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 8,
  children,
  ...props
}: Menu.Popup.Props & Pick<Menu.Positioner.Props, "align" | "sideOffset">) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="z-50 outline-none">
        <Menu.Popup
          className={cn(
            "bg-popover text-popover-foreground border-border min-w-56 origin-(--transform-origin) rounded-2xl border p-1.5 shadow-xl shadow-black/10 transition-[scale,opacity] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

const itemClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none select-none data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"

function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return <Menu.Item className={cn(itemClass, className)} {...props} />
}

function DropdownMenuLinkItem({ className, ...props }: Menu.LinkItem.Props) {
  return <Menu.LinkItem closeOnClick className={cn(itemClass, className)} {...props} />
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <Menu.Separator className={cn("bg-border -mx-1.5 my-1.5 h-px", className)} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
}
