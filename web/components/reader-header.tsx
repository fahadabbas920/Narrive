import Link from "next/link"
import { AccountMenu } from "@/components/account-menu"
import { BrandMark } from "@/components/brand"
import { ModeSwitch } from "@/components/mode-switch"
import { PageContainer } from "@/components/page-container"
import { ThemeToggle } from "@/components/theme-toggle"

export function ReaderHeader() {
  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
      <PageContainer className="grid h-16 grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <span className="text-foreground text-[17px] font-extrabold tracking-tight">Narrive</span>
        </Link>
        <ModeSwitch className="hidden md:flex" />
        <div className="flex items-center justify-end gap-1.5">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </PageContainer>
      <PageContainer className="flex justify-center pb-3 md:hidden">
        <ModeSwitch />
      </PageContainer>
    </header>
  )
}

export function ReaderFooter() {
  return (
    <footer className="border-border/70 mt-auto border-t">
      <PageContainer className="text-muted-foreground flex flex-col items-center justify-between gap-2 py-8 text-sm sm:flex-row">
        <div className="flex items-center gap-2">
          <BrandMark className="h-6 w-6 rounded-lg [&_svg]:h-3 [&_svg]:w-3" />
          <span className="text-foreground font-bold">Narrive</span>
          <span>· Every choice is a new story.</span>
        </div>
        <span>© {new Date().getFullYear()} Narrive</span>
      </PageContainer>
    </footer>
  )
}
