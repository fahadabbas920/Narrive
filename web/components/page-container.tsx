import { cn } from "@/lib/utils"

/** The one content width for reader pages — header, body and footer all align to it. */
export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />
  )
}
