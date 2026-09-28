import { Button, buttonVariants } from "./button"
import type { VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"
import { cn } from "../lib/utils"

type ButtonUIProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    render?: React.ReactElement
  }

export function ButtonUI({ className, render, ...props }: ButtonUIProps) {
  return (
    <Button
      className={cn("h-auto cursor-pointer gap-2 rounded-md px-4 py-2.5 text-sm", className)}
      render={render}
      nativeButton={!render}
      {...props}
    />
  )
}
