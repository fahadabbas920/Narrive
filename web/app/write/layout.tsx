import { Sidebar } from "@/components/app/sidebar"
import { Navbar } from "@/components/app/navbar"
import { WriterGate } from "@/components/app/writer-gate"

export default function WriterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <div className="relative flex flex-1 flex-col overflow-y-auto">
          <WriterGate>{children}</WriterGate>
        </div>
      </div>
    </div>
  )
}
