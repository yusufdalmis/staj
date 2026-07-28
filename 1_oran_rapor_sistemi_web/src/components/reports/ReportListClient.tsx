"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FileText, Calendar, Search, Download, FileType2, FileCode2, Trash2, Plus } from "lucide-react"
import { exportWordWeekly } from "@/lib/exportWordWeekly"
import { exportAnnualAsTemplate, exportAnnualAsDesigned } from "@/lib/exportWordAnnual"
import { useSession } from "next-auth/react"
import { useDialog } from "@/components/DialogProvider"

export default function ReportListClient({ type }: { type: 'WEEKLY' | 'ANNUAL' }) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const dialog = useDialog()
  const { data: session } = useSession()

  const [lists, setLists] = useState<Record<string, string[]>>({
    UNITS: [], SUB_UNITS: []
  })

  // Filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [unitFilter, setUnitFilter] = useState("")
  const [subUnitFilter, setSubUnitFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [myReportsOnly, setMyReportsOnly] = useState(false)
  const [sortOrder, setSortOrder] = useState("DESC")

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setLists(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      let url = "/api/reports?filter=all"
      if (startDate) url += `&startDate=${startDate}`
      if (endDate) url += `&endDate=${endDate}`
      if (unitFilter) url += `&unit=${encodeURIComponent(unitFilter)}`
      if (subUnitFilter && unitFilter === "Yatırım Destek Ofisi Faaliyetleri (YDO)") {
        url += `&subUnit=${encodeURIComponent(subUnitFilter)}`
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setReports(data)
        setSelectedIds([]) // Reset selection on fetch
      }
    } catch (error) {
      console.error("Failed to fetch reports", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLists()
    fetchReports()
  }, [])

  const filteredReports = reports.filter(report => {
    if (type === 'WEEKLY' && report.isAnnual) return false;
    if (type === 'ANNUAL' && !report.isAnnual) return false;

    if (myReportsOnly && session?.user?.id && report.userId !== session.user.id) return false;

    const searchMatch = 
      (report.annualDetails?.sopName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.activities || []).some((act: any) => (act.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (act.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!searchMatch && searchQuery) return false;
    
    return true;
  }).sort((a, b) => {
    if (sortOrder === "UPDATED_DESC" || sortOrder === "UPDATED_ASC") {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return sortOrder === "UPDATED_DESC" ? dateB - dateA : dateA - dateB;
    }
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "DESC" ? dateB - dateA : dateA - dateB;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReports.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredReports.map(r => r.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleExportWeeklyWord = () => {
    const selectedReports = filteredReports.filter(r => selectedIds.includes(r.id))
    if (selectedReports.length === 0) {
      dialog.alert("Lütfen dışa aktarılacak en az 1 faaliyet seçin.")
      return
    }
    try {
      exportWordWeekly(selectedReports)
    } catch(err: any) {
      dialog.alert(err.message)
    }
  }

  const handleExportAnnual = (exportType: 'template' | 'designed') => {
    const selectedReports = filteredReports.filter(r => selectedIds.includes(r.id) && r.isAnnual)
    if (selectedReports.length === 0) {
      dialog.alert("Lütfen dışa aktarılacak en az 1 Yıllık Ara Faaliyet seçin.")
      return
    }

    if (exportType === 'template') {
      exportAnnualAsTemplate(selectedReports)
    } else if (exportType === 'designed') {
      exportAnnualAsDesigned(selectedReports)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (await dialog.confirm("Bu raporu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) {
      try {
        const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
        if (res.ok) {
          dialog.alert("Rapor başarıyla silindi.")
          fetchReports()
        } else {
          dialog.alert("Rapor silinirken bir hata oluştu.")
        }
      } catch (err) {
        dialog.alert("Sistemsel bir hata oluştu.")
      }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sticky top-20 z-30 bg-gradient-to-r from-brand-primary/10 via-white/95 to-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 p-5 mx-2 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-brand-primary/30">
            {type === 'WEEKLY' ? <FileText size={24} /> : <FileCode2 size={24} />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-dark to-brand-primary">
              {type === 'WEEKLY' ? 'Haftalık Faaliyetler' : 'Yıllık Faaliyetler'}
            </h1>
            <p className="text-brand-dark/70 text-sm font-medium mt-0.5">
              Tüm birimlerin faaliyet raporlarını buradan yönetebilir ve profesyonel formatlarda indirebilirsiniz.
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {selectedIds.length > 0 && (
        
            <div className="flex flex-wrap gap-3 bg-white/60 p-2.5 rounded-2xl border border-brand-primary/20 shadow-inner">
              <div className="text-sm font-extrabold text-brand-primary flex items-center px-3 bg-brand-primary/10 rounded-xl">
                {selectedIds.length} Seçili
              </div>
              <div className="flex flex-wrap gap-2">
                {type === 'WEEKLY' ? (
                  <button onClick={handleExportWeeklyWord} className="text-xs px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/40 hover:-translate-y-0.5 rounded-xl font-bold flex items-center gap-1.5 transition-all"><FileType2 size={16} /> Haftalık Çıktı</button>
                ) : (
                  <>
                    <button onClick={() => handleExportAnnual('template')} className="text-xs px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/40 hover:-translate-y-0.5 rounded-xl font-bold flex items-center gap-1.5 transition-all"><FileCode2 size={16} /> Yıllık (Taslak)</button>
                    <button onClick={() => handleExportAnnual('designed')} className="text-xs px-4 py-2 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5 rounded-xl font-bold flex items-center gap-1.5 transition-all"><FileType2 size={16} /> Yıllık (Tasarım)</button>
                  </>
                )}
              </div>
            </div>
          )}
          <Link 
            href={`/dashboard/rapor-giris?type=${type === 'WEEKLY' ? 'WEEKLY' : 'ANNUAL'}`}
            className="text-xs px-4 py-2 bg-gradient-to-br from-brand-primary to-blue-600 text-white shadow-md shadow-brand-primary/20 hover:shadow-lg hover:-translate-y-0.5 rounded-xl font-bold flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} /> {type === 'WEEKLY' ? 'Yeni Haftalık Rapor' : 'Yeni Yıllık Rapor'}
          </Link>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-dark/5 space-y-4">
        <h3 className="font-bold text-brand-dark flex items-center gap-2"><Search size={18} /> Filtrele</h3>
        
        <div className="flex bg-brand-dark/5 p-1 rounded-xl w-full md:w-auto md:max-w-md mb-4">
          <button 
            type="button" 
            onClick={() => setMyReportsOnly(false)}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all ${!myReportsOnly ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-dark/70 hover:text-brand-dark'}`}
          >
            Tüm Faaliyetler
          </button>
          <button 
            type="button" 
            onClick={() => setMyReportsOnly(true)}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all ${myReportsOnly ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-dark/70 hover:text-brand-dark'}`}
          >
            Benim Yazdıklarım
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Başlangıç Tarihi</label>
            <input 
              type="date" 
              value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Bitiş Tarihi</label>
            <input 
              type="date" 
              value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Birim</label>
            <select 
              value={unitFilter} onChange={e => { setUnitFilter(e.target.value); setSubUnitFilter(""); }}
              className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
            >
              <option value="">Tümü</option>
              {(lists.UNITS || []).map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {unitFilter === "Yatırım Destek Ofisi Faaliyetleri (YDO)" && (
            <div>
              <label className="block text-xs font-bold text-brand-dark mb-1">İl / Ofis</label>
              <select 
                value={subUnitFilter} onChange={e => setSubUnitFilter(e.target.value)}
                className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
              >
                <option value="">Tümü</option>
                {(lists.SUB_UNITS || []).map(su => <option key={su} value={su}>{su}</option>)}
              </select>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Arama (Faaliyet / SOP)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={14} className="text-brand-dark/40" /></div>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary" placeholder="Arama..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Sıralama</label>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary">
              <option value="DESC">Oluşturma: Yeniden Eskiye</option>
              <option value="ASC">Oluşturma: Eskiden Yeniye</option>
              <option value="UPDATED_DESC">Değiştirilme: Yeniden Eskiye</option>
              <option value="UPDATED_ASC">Değiştirilme: Eskiden Yeniye</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button 
            onClick={fetchReports}
            className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-colors"
          >
            Uygula
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-brand-dark/5">
          <p className="text-brand-dark font-bold opacity-50">Yükleniyor...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-brand-dark/5">
          <p className="text-brand-dark font-bold opacity-50">Kriterlere uygun faaliyet bulunamadı.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-light/30 text-brand-dark font-bold border-b border-brand-dark/10">
                <tr>
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredReports.length && filteredReports.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-brand-dark/20 text-brand-primary focus:ring-brand-primary"
                    />
                  </th>
                  <th className="px-6 py-4">Faaliyet Türü</th>
                  <th className="px-6 py-4">Oluşturulma</th>
                  <th className="px-6 py-4">Değiştirilme</th>
                  <th className="px-6 py-4">Birim</th>
                  <th className="px-6 py-4">Kullanıcı</th>
                  <th className="px-6 py-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/5">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-brand-light/10 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(report.id)}
                        onChange={() => toggleSelect(report.id)}
                        className="w-4 h-4 rounded border-brand-dark/20 text-brand-primary focus:ring-brand-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${report.isAnnual ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-dark/5 text-brand-dark'}`}>
                          {type === 'WEEKLY' ? <FileText size={16} /> : <FileCode2 size={16} />}
                        </div>
                        <span className="font-bold text-brand-dark">
                          {report.isAnnual ? "Yıllık Ara Faaliyet" : "Haftalık Faaliyet"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-brand-dark font-medium">
                        <Calendar size={14} className="opacity-70" />
                        <span>{new Date(report.createdAt).toLocaleDateString("tr-TR")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-brand-dark/60 font-medium text-xs">
                        <span>{report.updatedAt ? new Date(report.updatedAt).toLocaleDateString("tr-TR") : "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-brand-dark/5 text-brand-dark font-bold text-xs">
                        {report.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-brand-dark">
                      {report.user.name}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                      <Link 
                        href={`/dashboard/rapor-detay/${report.id}`}
                        className="text-brand-primary hover:text-brand-secondary font-bold transition-colors text-sm"
                      >
                        İncele
                      </Link>
                      {(session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") && (
                        <button 
                          onClick={() => handleDeleteReport(report.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          title="Raporu Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
