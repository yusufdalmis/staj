"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ActivitySquare, Loader2, Search, Filter } from "lucide-react"

type SystemLog = {
  id: string
  action: string
  details: string
  ip: string | null
  createdAt: string
  user: {
    name: string | null
    email: string
    unit: string | null
  } | null
}

export default function SystemLogsPage() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("")

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs")
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>
  
  if (session?.user?.role !== "SUPER_ADMIN") return <div>Yetkiniz yok.</div>

  // Extract unique actions for the filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)))

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.user?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.user?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAction = actionFilter ? log.action === actionFilter : true

    return matchesSearch && matchesAction
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Sistem Logları</h1>
          <p className="text-brand-dark/60 text-sm mt-1">Sistem üzerinde yapılan işlemlerin denetim izini (Audit Trail) görüntüleyin.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-brand-dark/10">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-brand-dark/40" />
          </div>
          <input 
            type="text" 
            placeholder="Kullanıcı, email, işlem tipi veya detay ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-brand-dark placeholder-brand-dark/50"
          />
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={18} className="text-brand-dark/40" />
          </div>
          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors appearance-none text-brand-dark"
          >
            <option value="" className="text-brand-dark bg-white">Tüm İşlemler</option>
            {uniqueActions.map(action => (
              <option key={action} value={action} className="text-brand-dark bg-white">{action}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-light/50 border-b border-brand-dark/10">
                <th className="p-4 font-semibold text-brand-dark w-48">Tarih</th>
                <th className="p-4 font-semibold text-brand-dark">Kullanıcı / Birim</th>
                <th className="p-4 font-semibold text-brand-dark w-48">İşlem Tipi</th>
                <th className="p-4 font-semibold text-brand-dark">Detaylar</th>
                <th className="p-4 font-semibold text-brand-dark w-32">IP Adresi</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-brand-dark/10 hover:bg-brand-light/50 transition-colors">
                  <td className="p-4 text-sm font-medium text-brand-dark whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="p-4">
                    {log.user ? (
                      <div>
                        <div className="font-semibold text-brand-dark">{log.user.name}</div>
                        <div className="text-xs text-brand-dark/80">{log.user.unit || log.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-brand-dark/60 italic">Bilinmeyen Kullanıcı</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-primary/10 text-brand-primary">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-brand-dark font-mono bg-brand-light/70 p-2 rounded-lg max-w-md overflow-x-auto whitespace-pre-wrap break-all">
                      {log.details}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-brand-dark font-mono">
                    {log.ip || "-"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-brand-dark/70">Arama kriterlerine uygun log bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
