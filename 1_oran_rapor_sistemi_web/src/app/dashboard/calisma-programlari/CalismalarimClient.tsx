"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Calendar, FileText, Download, Trash2 } from "lucide-react"
import { exportWorkProgramAsDesigned } from "@/lib/exportWordWorkProgram"
import { useDialog } from "@/components/DialogProvider"

export default function CalismalarimClient({ initialPrograms, userRole, currentUserId }: { initialPrograms: any[], userRole: string, currentUserId: string }) {
  const dialog = useDialog()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [unitFilter, setUnitFilter] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [lists, setLists] = useState<Record<string, string[]>>({ UNITS: [], SUB_UNITS: [] })

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => setLists(data))
      .catch(console.error)
  }, [])

  const handleDeleteProgram = async (id: string) => {
    if (await dialog.confirm("Bu çalışma programını kalıcı olarak silmek istediğinize emin misiniz?")) {
      try {
        const res = await fetch(`/api/admin/work-programs/${id}`, { method: 'DELETE' })
        if (res.ok) {
          dialog.alert("Çalışma programı başarıyla silindi.")
          // Reload page to refresh initialPrograms, or we can just filter it client side.
          window.location.reload()
        } else {
          dialog.alert("Silinirken bir hata oluştu.")
        }
      } catch (err) {
        dialog.alert("Sistemsel bir hata oluştu.")
      }
    }
  }

  // Filter and sort programs
  const filteredPrograms = initialPrograms.filter(program => {
    // Search
    const searchMatch = 
      (program.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (program.year?.toString() || "").includes(searchQuery)
    
    if (!searchMatch && searchQuery) return false

    if (unitFilter && program.unit !== unitFilter) return false
    if (yearFilter && program.year?.toString() !== yearFilter) return false
    
    if (userFilter) {
      if (userFilter === "ME") {
        if (program.user?.id !== currentUserId) return false
      } else {
        if (program.user?.id !== userFilter) return false
      }
    }

    return true
  }).sort((a, b) => {
    if (sortOrder === "UPDATED_DESC" || sortOrder === "UPDATED_ASC") {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return sortOrder === "UPDATED_DESC" ? dateB - dateA : dateA - dateB;
    }
    if (sortOrder === "CREATED_DESC" || sortOrder === "CREATED_ASC") {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "CREATED_DESC" ? dateB - dateA : dateA - dateB;
    }
    return sortOrder === "DESC" ? b.year - a.year : a.year - b.year
  })

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPrograms.length && filteredPrograms.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredPrograms.map(p => p.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleBatchExport = () => {
    const selectedPrograms = filteredPrograms.filter(p => selectedIds.includes(p.id))
    if (selectedPrograms.length === 0) {
      dialog.alert("Lütfen indirmek için en az bir çalışma programı seçin.")
      return
    }
    exportWorkProgramAsDesigned(selectedPrograms)
  }

  const allUnits = [...(lists.UNITS || []), ...(lists.SUB_UNITS || [])]
  const uniqueYears = Array.from(new Set(initialPrograms.map(p => p.year))).sort((a, b) => b - a)

  const uniqueUsers = Array.from(new Map(initialPrograms.map(p => [p.user?.id, p.user])).values()).filter(Boolean)

  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sticky top-20 z-30 bg-gradient-to-r from-brand-primary/10 via-white/95 to-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 p-5 mx-2 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-brand-primary/30">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-dark to-brand-primary">
              Çalışma Programı
            </h1>
            <p className="text-brand-dark/70 text-sm font-medium mt-0.5">
              Ajansın yıllık planlanan çalışma programları ve faaliyetleri.
            </p>
          </div>
        </div>
        
          <div className="flex gap-2 items-center">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-white/60 p-2 rounded-xl border border-brand-primary/20 shadow-inner">
              <span className="text-xs font-bold text-brand-primary px-2">{selectedIds.length} Seçili</span>
              <button onClick={handleBatchExport} className="text-xs px-3 py-1.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 hover:shadow-lg rounded-lg font-bold flex items-center gap-1.5 transition-all">
                <Download size={14} /> Toplu İndir
              </button>
            </div>
          )}
          <Link 
            href="/dashboard/rapor-giris?type=WORK_PROGRAM"
            className="text-xs px-4 py-2 bg-gradient-to-br from-brand-primary to-blue-600 text-white shadow-md shadow-brand-primary/20 hover:shadow-lg hover:-translate-y-0.5 rounded-xl font-bold flex items-center gap-1.5 transition-all"
          >
            Yeni Program Ekle
          </Link>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-dark/5 space-y-4 mx-2">
        <h3 className="font-bold text-brand-dark flex items-center gap-2"><Search size={18} /> Filtrele</h3>
        <div className="flex bg-brand-dark/5 p-1 rounded-xl w-full md:w-auto md:max-w-md mb-4">
          <button 
            type="button" 
            onClick={() => setUserFilter("")}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all ${userFilter === "" ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-dark/70 hover:text-brand-dark'}`}
          >
            Tüm Programlar
          </button>
          <button 
            type="button" 
            onClick={() => setUserFilter("ME")}
            className={`flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-all ${userFilter === "ME" ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-dark/70 hover:text-brand-dark'}`}
          >
            Benim Yazdıklarım
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Birim</label>
            <select 
              value={unitFilter} onChange={e => setUnitFilter(e.target.value)}
              className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-black outline-none focus:border-brand-primary"
            >
              <option value="">Tümü</option>
              {allUnits.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Yıl</label>
            <select 
              value={yearFilter} onChange={e => setYearFilter(e.target.value)}
              className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-black outline-none focus:border-brand-primary"
            >
              <option value="">Tümü</option>
              {uniqueYears.map(y => <option key={y} value={y.toString()}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Arama (Program Adı)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={14} className="text-brand-dark/40" /></div>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-black outline-none focus:border-brand-primary" placeholder="Arama..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-dark mb-1">Sıralama</label>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full p-2.5 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-black outline-none focus:border-brand-primary">
              <option value="DESC">Yıl: Yeniden Eskiye</option>
              <option value="ASC">Yıl: Eskiden Yeniye</option>
              <option value="CREATED_DESC">Oluşturma: Yeniden Eskiye</option>
              <option value="CREATED_ASC">Oluşturma: Eskiden Yeniye</option>
              <option value="UPDATED_DESC">Değiştirilme: Yeniden Eskiye</option>
              <option value="UPDATED_ASC">Değiştirilme: Eskiden Yeniye</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mx-2">
        {filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-brand-dark/5">
            <p className="text-brand-dark font-bold opacity-50">Kriterlere uygun çalışma programı bulunamadı.</p>
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
                        checked={selectedIds.length === filteredPrograms.length && filteredPrograms.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-brand-dark/20 text-brand-primary focus:ring-brand-primary"
                      />
                    </th>
                    <th className="px-6 py-4">Yıl</th>
                    <th className="px-6 py-4">Birim</th>
                    <th className="px-6 py-4">Ekleyen</th>
                    <th className="px-6 py-4">Program Adı</th>
                    <th className="px-6 py-4">Faaliyet Sayısı</th>
                    <th className="px-6 py-4">Oluşturulma</th>
                    <th className="px-6 py-4">Değiştirilme</th>
                    <th className="px-6 py-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark/5">
                  {filteredPrograms.map((program) => (
                    <tr key={program.id} className="hover:bg-brand-light/10 transition-colors">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(program.id)}
                          onChange={() => toggleSelect(program.id)}
                          className="w-4 h-4 rounded border-brand-dark/20 text-brand-primary focus:ring-brand-primary"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-brand-dark font-medium">
                          <Calendar size={14} className="opacity-70" />
                          <span className="font-bold">{program.year}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-black font-medium">
                        {program.unit || "-"}
                      </td>
                      <td className="px-6 py-4 text-black font-medium">
                        {program.user?.name || program.user?.email || "-"}
                      </td>
                      <td className="px-6 py-4 text-black font-bold">
                        {program.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-lg bg-brand-dark/5 text-brand-dark font-bold text-xs">
                          {program.activities?.length || 0} Ana Faaliyet
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-brand-dark font-medium text-xs">
                          <Calendar size={14} className="opacity-70" />
                          <span>{new Date(program.createdAt).toLocaleDateString("tr-TR")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-brand-dark/60 font-medium text-xs">
                          {program.updatedAt ? new Date(program.updatedAt).toLocaleDateString("tr-TR") : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3 items-center">
                          <button
                            onClick={() => exportWorkProgramAsDesigned(program)}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Word İndir"
                          >
                            <Download size={18} />
                          </button>
                          <Link 
                            href={`/dashboard/program-detay/${program.id}`}
                            className="text-brand-primary hover:text-brand-secondary font-bold transition-colors text-sm"
                          >
                            İncele
                          </Link>
                          {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
                            <button
                              onClick={() => handleDeleteProgram(program.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title="Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
