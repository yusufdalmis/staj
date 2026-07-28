"use client"

import { useSession, signOut } from "next-auth/react"
import { LogOut, User as UserIcon, Bell, AlertTriangle } from "lucide-react"
import { useState, useEffect } from "react"
import clsx from "clsx"

type Notification = {
  id: string
  title: string
  message: string
  type: string
}

export function TopBar() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
      fetch("/api/admin/notifications")
        .then(res => res.json())
        .then(data => {
          if (data.warnings) {
            setNotifications(data.warnings)
          }
        })
        .catch(err => console.error(err))
    }
  }, [session])

  if (!session) return null

  const hasWarnings = notifications.length > 0

  return (
    <>
      {/* BANNER */}
      {(session.user?.role === "ADMIN" || session.user?.role === "SUPER_ADMIN") && hasWarnings && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-red-800">{notifications[0].title}</h3>
            <p className="text-red-700 text-sm mt-1 leading-relaxed">
              {notifications[0].message}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end items-center mb-6 pb-4 border-b border-brand-dark/10">
        <div className="flex items-center gap-4">
          
          {/* BELL ICON */}
          {(session.user?.role === "ADMIN" || session.user?.role === "SUPER_ADMIN") && (
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className={clsx(
                  "relative p-2.5 rounded-xl transition-all duration-300",
                  hasWarnings 
                    ? "bg-red-50 text-red-600 hover:bg-red-100" 
                    : "bg-brand-light/50 text-brand-dark/50 hover:bg-brand-light hover:text-brand-dark"
                )}
              >
                <Bell size={20} className={clsx(hasWarnings && "animate-pulse")} />
                {hasWarnings && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
              </button>
              
              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-brand-dark/10 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-brand-dark/5 bg-brand-light/30">
                    <h4 className="font-bold text-brand-dark">Bildirimler</h4>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {hasWarnings ? (
                      notifications.map(n => (
                        <div key={n.id} className="p-4 border-b border-brand-dark/5 hover:bg-brand-light/10 transition-colors">
                          <h5 className="font-bold text-sm text-brand-dark mb-1">{n.title}</h5>
                          <p className="text-xs text-brand-dark/70 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-brand-dark/50 text-sm">
                        Şu an için yeni bildiriminiz yok.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="hidden md:flex flex-col items-end border-l border-brand-dark/10 pl-4">
            <span className="text-sm font-bold text-brand-dark">{session.user?.name}</span>
            <span className="text-xs text-brand-dark/60">{session.user?.unit || session.user?.role}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
            <UserIcon size={20} />
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-brand-dark/20 text-brand-dark/70 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl transition-all shadow-sm font-medium text-sm"
            title="Çıkış Yap"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </>
  )
}
