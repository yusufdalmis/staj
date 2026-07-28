"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  LogOut,
  FilePlus,
  Building2,
  Menu,
  X,
  Wallet,
  Users,
  ActivitySquare,
  Bell
} from "lucide-react"
import { useState } from "react"
import clsx from "clsx"

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { name: "Panel", href: "/dashboard", icon: LayoutDashboard },
    { name: "Faaliyet Girişi", href: "/dashboard/rapor-giris", icon: FilePlus },
    { name: "Haftalık Faaliyetler", href: "/dashboard/haftalik-faaliyetler", icon: FileText },
    { name: "Yıllık Faaliyetler", href: "/dashboard/yillik-faaliyetler", icon: Building2 },
    { name: "Çalışma Programları", href: "/dashboard/calisma-programlari", icon: FileText },
  ]

  navItems.push({ name: "Ayarlar", href: "/dashboard/admin/ayarlar", icon: Settings })

  if (session?.user?.role === "SUPER_ADMIN") {
    navItems.push({ name: "Kullanıcılar", href: "/dashboard/admin/kullanicilar", icon: Users })
    navItems.push({ name: "Sistem Logları", href: "/dashboard/admin/loglar", icon: ActivitySquare })
    navItems.push({ name: "Bildirim Ayarları", href: "/dashboard/admin/ayarlar/bildirim", icon: Bell })
  }

  return (
    <>
      {/* Mobile toggle */}
      <button 
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md text-brand-dark"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={clsx(
        "fixed md:static inset-y-0 left-0 z-40 w-72 bg-white/80 backdrop-blur-xl border-r border-white/60 shadow-[4px_0_24px_0_rgba(31,38,135,0.05)] transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/30">
            <span className="text-white font-bold text-sm tracking-wide">ORAN</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-dark leading-tight">ORAN Rapor</h2>
            <p className="text-xs text-brand-dark/60">Yönetim Sistemi</p>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="p-3 rounded-xl bg-brand-light/50 border border-white">
            <p className="text-sm font-semibold text-brand-dark">{session?.user?.name}</p>
            <p className="text-xs text-brand-dark/70 mt-0.5">{session?.user?.unit || session?.user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.name} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group",
                  isActive 
                    ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20" 
                    : "text-brand-dark/70 hover:bg-white hover:text-brand-primary hover:shadow-sm"
                )}
              >
                <item.icon size={20} className={clsx("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-brand-dark/50 group-hover:text-brand-primary")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-brand-dark/10">
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl font-medium text-brand-dark/70 hover:bg-red-50 hover:text-brand-secondary transition-all group"
          >
            <LogOut size={20} className="text-brand-dark/50 group-hover:text-brand-secondary transition-transform group-hover:-translate-x-1" />
            Çıkış Yap
          </button>
        </div>
      </div>
    </>
  )
}
