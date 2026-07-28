"use client"

import { useState } from "react"
import Link from "next/link"
import { useDialog } from "@/components/DialogProvider"
import { FileText, Edit, Calendar, FileType2, FileCode2, Filter, ArrowDownWideNarrow, Search } from "lucide-react"
import { exportWordWeekly } from "@/lib/exportWordWeekly"
import { exportAnnualAsTemplate, exportAnnualAsDesigned } from "@/lib/exportWordAnnual"

export default function RaporlarimClient({ initialReports }: { initialReports: any[] }) {
  const dialog = useDialog()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL") // ALL, WEEKLY, ANNUAL
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortOrder, setSortOrder] = useState("DESC") // DESC, ASC

  // Filter and sort reports
  const filteredReports = initialReports.filter(report => {
    // Search
    const searchMatch = 
      (report.annualDetails?.sopName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.activities.some((act: any) => act.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    if (!searchMatch && searchQuery) return false

    // Type filter
    if (typeFilter === "WEEKLY" && report.isAnnual) return false
    if (typeFilter === "ANNUAL" && !report.isAnnual) return false

    // Date filter
    if (startDate || endDate) {
      const reportDate = new Date(report.createdAt).getTime()
      if (startDate && reportDate < new Date(startDate).getTime()) return false
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        if (reportDate > end.getTime()) return false
      }
    }

    return true
  }).sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortOrder === "DESC" ? dateB - dateA : dateA - dateB
  })


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
    const selectedReports = initialReports.filter(r => selectedIds.includes(r.id))
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

  const handleExportAnnual = (type: 'template' | 'designed') => {
    const selectedReports = initialReports.filter(r => selectedIds.includes(r.id) && r.isAnnual)
    if (selectedReports.length === 0) {
      dialog.alert("Lütfen dışa aktarılacak en az 1 Yıllık Ara Faaliyet seçin.")
      return
    }

    if (type === 'template') {
      exportAnnualAsTemplate(selectedReports)
    } else if (type === 'designed') {
      exportAnnualAsDesigned(selectedReports)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Faaliyetlerim</h1>
          <p className="text-brand-dark text-sm mt-1 font-medium">Girdiğiniz faaliyetleri buradan görüntüleyebilir, filtreleyebilir ve dışa aktarabilirsiniz.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex gap-2 bg-brand-primary/5 p-2 rounded-xl border border-brand-primary/20">
              <span className="text-sm font-bold text-brand-primary px-2 flex items-center">{selectedIds.length} Seçili</span>
              <button onClick={handleExportWeeklyWord} className="text-xs px-2 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-bold"><FileType2 size={14} className="inline mr-1" />Haftalık Word</button>
              {initialReports.filter(r => selectedIds.includes(r.id)).every(r => r.isAnnual) && (
                <>
                  <div className="w-px bg-brand-primary/20 mx-1"></div>
                  <button onClick={() => handleExportAnnual('template')} className="text-xs px-2 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg font-bold"><FileCode2 size={14} className="inline mr-1" />Yıllık Word</button>
                </>
              )}
            </div>
          )}
          <Link 
            href="/dashboard/rapor-giris"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white font-medium shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-colors whitespace-nowrap"
          >
            Yeni Faaliyet Ekle
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-brand-dark/10">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-brand-dark/40" />
          </div>
          <input 
            type="text" 
            placeholder="Faaliyet içeriği veya SOP adında ara..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <div className="relative min-w-[140px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={16} className="text-brand-dark/40" />
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors appearance-none text-sm font-medium text-brand-dark"
            >
              <option value="ALL">Tüm Tipler</option>
              <option value="WEEKLY">Haftalık Faaliyetler</option>
              <option value="ANNUAL">Yıllık Faaliyetler</option>
            </select>
          </div>

          <div className="flex gap-2 flex-1">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-sm font-medium text-brand-dark"
              title="Başlangıç Tarihi"
            />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-sm font-medium text-brand-dark"
              title="Bitiş Tarihi"
            />
          </div>

          <div className="relative min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ArrowDownWideNarrow size={16} className="text-brand-dark/40" />
            </div>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors appearance-none text-sm font-medium text-brand-dark"
            >
              <option value="DESC">Yeniden Eskiye</option>
              <option value="ASC">Eskiden Yeniye</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 px-2">
        <input 
          type="checkbox" 
          id="selectAll"
          checked={selectedIds.length === filteredReports.length && filteredReports.length > 0}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-brand-dark/20 text-brand-primary focus:ring-brand-primary"
        />
        <label htmlFor="selectAll" className="text-sm font-bold text-brand-dark cursor-pointer">
          Tümünü Seç {filteredReports.length > 0 && `(${filteredReports.length})`}
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white rounded-3xl border border-brand-dark/5 shadow-sm">
            <FileText className="mx-auto w-12 h-12 text-brand-dark/40 mb-4" />
            <p className="text-brand-dark font-medium">Bu kriterlere uygun faaliyet bulunamadı.</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div key={report.id} className="relative bg-white rounded-2xl p-5 shadow-sm border border-brand-dark/5 flex flex-col transition-all hover:shadow-md">
              <div className="absolute top-4 right-4">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(report.id)}
                  onChange={() => toggleSelect(report.id)}
                  className="w-5 h-5 rounded border-brand-dark/20 text-brand-primary focus:ring-brand-primary"
                />
              </div>

              <div className="flex justify-between items-start mb-4 pr-8">
                <span className={`px-3 py-1 text-xs font-bold rounded-lg ${
                  report.isAnnual 
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "bg-brand-secondary/10 text-brand-secondary"
                }`}>
                  {report.isAnnual ? "Yıllık Ara Faaliyet" : "Haftalık Faaliyet"}
                </span>
              </div>
              
              <div className="mb-4 flex-1">
                <h3 className="font-bold text-brand-dark line-clamp-1">
                  {report.unit}
                </h3>
                <p className="text-sm font-medium text-brand-dark mt-2 flex items-center gap-1.5">
                  <Calendar size={14} className="opacity-70" />
                  {new Date(report.createdAt).toLocaleDateString("tr-TR")}
                </p>
                {report.isAnnual && report.annualDetails && (
                  <p className="text-sm font-medium text-brand-dark mt-3 line-clamp-2 bg-brand-light/50 p-2 rounded-lg border border-brand-dark/5">
                    <span className="font-bold text-brand-primary block text-xs mb-1">SOP:</span>
                    {report.annualDetails.sopName}
                  </p>
                )}
                {!report.isAnnual && report.activities.length > 0 && (
                  <p className="text-sm font-medium text-brand-dark mt-3 line-clamp-2 bg-brand-light/50 p-2 rounded-lg border border-brand-dark/5">
                    {report.activities[0].description}
                  </p>
                )}
                {!report.isAnnual && (
                  <p className="text-xs font-bold text-brand-dark mt-3 flex items-center gap-1.5 opacity-80">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-dark"></span>
                    {report.activities?.length || 0} Faaliyet
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-brand-dark/10">
                <Link 
                  href={`/dashboard/raporlarim/${report.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-light/50 text-brand-dark font-bold hover:bg-brand-primary hover:text-white transition-colors text-sm border border-brand-dark/5"
                >
                  <Edit size={16} /> Detay
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

