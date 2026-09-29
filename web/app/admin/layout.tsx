import type { Metadata } from "next"
import { Sidebar } from "@/components/app/sidebar"
import { Navbar } from "@/components/app/navbar"
import { AdminGate } from "@/components/admin/admin-gate"

export const metadata: Metadata = { title: "Admin · Narrive" }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-screen">
      <Sidebar variant="admin" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar variant="admin" />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <AdminGate>{children}</AdminGate>
        </div>
      </div>
    </div>
  )
}
