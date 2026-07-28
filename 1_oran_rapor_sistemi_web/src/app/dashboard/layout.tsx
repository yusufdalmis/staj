import { Sidebar } from "@/components/layout/Sidebar"

import { TopBar } from "@/components/layout/TopBar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-brand-light overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <TopBar />
          {children}
        </div>
      </main>
    </div>
  )
}
