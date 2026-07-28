"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Building2, Calendar, Target, CheckCircle2, Edit } from "lucide-react"
import { exportWorkProgramAsDesigned } from "@/lib/exportWordWorkProgram"
import { useSession } from "next-auth/react"

export default function WorkProgramDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const { data: session } = useSession()

  const [loading, setLoading] = useState(true)
  const [program, setProgram] = useState<any>(null)
  const [unitFilter, setUnitFilter] = useState("")

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        const res = await fetch(`/api/work-programs/${id}`)
        if (res.ok) {
          const data = await res.json()
          setProgram(data)
        } else {
          console.error("Failed to fetch work program")
        }
      } catch (error) {
        console.error("Error fetching work program:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProgram()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="bg-white/80 p-12 rounded-2xl border border-brand-dark/5 shadow-sm text-center">
        <h2 className="text-xl font-bold text-brand-dark mb-2">Program Bulunamadı</h2>
        <p className="text-brand-dark/60 mb-6">Aradığınız çalışma programına ulaşılamıyor veya silinmiş olabilir.</p>
        <Link href="/dashboard/calismalarim" className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-primary/90 transition-all">
          <ArrowLeft size={20} />
          Listeye Dön
        </Link>
      </div>
    )
  }

  const handleExport = () => {
    // Sadece filtrelenmiş aktiviteleri word'e aktaralım veya tüm programı aktaralım. Mantıken sadece ekranda görünenleri aktarmak daha iyi olabilir.
    const exportData = { ...program, activities: filteredActivitiesRaw }
    exportWorkProgramAsDesigned([exportData])
  }

  const uniqueUnits = Array.from(new Set(
    (program.activities || []).map((a: any) => a.responsibleUnit).filter(Boolean)
  )).sort() as string[]

  const filteredActivitiesRaw = (program.activities || []).filter((act: any) => {
    if (unitFilter && act.responsibleUnit !== unitFilter) return false
    return true
  })

  const filteredActivities: any[] = []
  for (const act of filteredActivitiesRaw) {
    if (act.budgets && act.budgets.length > 0) {
      for (const budget of act.budgets) {
        filteredActivities.push({
          ...act,
          budgetCode: budget.code || "-",
          budgetName: budget.name || "-",
          budgetAmount: budget.amount || "-"
        })
      }
    } else {
      filteredActivities.push({
        ...act,
        budgetName: "-",
        budgetAmount: "-"
      })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-brand-primary/5 via-white/80 to-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm sticky top-20 z-30">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/calismalarim" className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-brand-primary hover:text-white text-brand-dark/70 transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-lg border border-brand-primary/20">
                {program.year} Yılı
              </span>
              <span className="px-3 py-1 bg-brand-dark/5 text-brand-dark text-xs font-bold rounded-lg border border-brand-dark/10 flex items-center gap-1.5">
                <Building2 size={12} /> {program.unit || "Birim Belirtilmemiş"}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-brand-dark">{program.name}</h1>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          <select 
            value={unitFilter} onChange={e => setUnitFilter(e.target.value)}
            className="w-full md:w-64 p-2.5 bg-white border border-brand-dark/20 rounded-xl text-sm font-medium text-black outline-none focus:border-brand-primary"
          >
            <option value="">Tüm Birimler</option>
            {uniqueUnits.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {program && session?.user && (session.user.role === 'ADMIN' || session.user.id === program.userId) && (
            <Link 
              href={`/dashboard/admin/calisma-programlari/${program.id}`}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-white text-brand-primary border border-brand-primary px-6 py-2.5 rounded-xl font-medium hover:bg-brand-primary/10 transition-all shadow-sm"
            >
              <Edit size={20} /> Düzenle
            </Link>
          )}
          <button 
            onClick={handleExport}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/20"
          >
            <Download size={20} /> Word İndir
          </button>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* TABLO 1: SONUÇ VE ÇIKTI HEDEFLERİ */}
        {(() => {
          const activitiesWithResults = filteredActivitiesRaw.filter((a: any) => 
            a.performanceIndicator || a.resultIndicator || a.measurementUnit || a.target || a.verificationSource
          );

          if (activitiesWithResults.length === 0) return null;

          return (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
          <div className="p-6 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/50 to-transparent">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Target size={20} className="text-brand-primary" /> 
              c. Sonuç ve Çıktı Hedefleri
            </h2>
            <p className="text-sm text-black mt-1">YKF Sonuç/Çıktı Göstergeleri</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-brand-light/30 text-black font-bold border-b border-brand-dark/10">
                <tr>
                  <th className="px-4 py-3 border-r border-brand-dark/5">Faaliyet</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5">Performans Göstergeleri</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5">Sonuç/Çıktı Göstergesi</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5">Ölçüm Birimi</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5 text-center">Hedef</th>
                  <th className="px-4 py-3">Doğrulama Kaynağı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/5">
                {activitiesWithResults.map((act: any, idx: number) => (
                  <tr key={idx} className="hover:bg-brand-light/10 transition-colors">
                    <td className="px-4 py-3 border-r border-brand-dark/5 font-medium text-black">{act.name || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{act.performanceIndicator || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{act.resultIndicator || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{act.measurementUnit || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-center font-bold text-brand-primary">{act.target || "-"}</td>
                    <td className="px-4 py-3 text-black">{act.verificationSource || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
        })()}

        {/* TABLO 2: PROGRAM SÜRESİ VE ZAMAN PLANLAMASI */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
          <div className="p-6 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/50 to-transparent">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Calendar size={20} className="text-brand-primary" /> 
              e. Program Süresi ve Zaman Planlaması
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
              <thead className="bg-brand-light/30 text-black font-bold border-b border-brand-dark/10">
                <tr>
                  <th className="px-4 py-3 border-r border-brand-dark/5 w-64" rowSpan={2}>Faaliyet</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5 w-24" rowSpan={2}>İlgili Özel Amaç</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5" rowSpan={2}>Sorumlu Birim</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5" rowSpan={2}>Destek Birim</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5" rowSpan={2}>Paydaşlar</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5" rowSpan={2}>Bütçe Adı</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5" rowSpan={2}>Bütçe Kodu</th>
                  <th className="px-4 py-3 border-r border-brand-dark/5" rowSpan={2}>Bütçe Tutarı</th>
                  <th className="px-2 py-2 text-center border-b border-brand-dark/5 bg-brand-light/50" colSpan={12}>{program.year} Yılı Aylar</th>
                </tr>
                <tr>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <th key={m} className="px-1 py-2 border-r border-brand-dark/5 text-center text-xs w-8">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark/5">
                {filteredActivities.length > 0 ? filteredActivities.map((act: any, idx: number) => (
                  <tr key={idx} className="hover:bg-brand-light/10 transition-colors">
                    <td className="px-4 py-3 border-r border-brand-dark/5 font-medium text-black">{act.name || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-center text-black">{act.relatedGoal || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-center text-black">{act.responsibleUnit || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-center text-black">{act.supportUnit || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-xs text-black">{(act.stakeholders || []).join(", ") || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-center text-black">{act.budgetName || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-center text-black">{act.budgetCode || "-"}</td>
                    <td className="px-4 py-3 border-r border-brand-dark/5 text-center text-black">{act.budgetAmount || "-"}</td>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                      const isPlanned = (act.plannedMonths || []).includes(m)
                      return (
                        <td key={m} className="px-1 py-3 border-r border-brand-dark/5 text-center">
                          {isPlanned ? <span className="text-brand-primary font-bold text-xs block mx-auto text-center w-full">x</span> : ""}
                        </td>
                      )
                    })}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={20} className="px-4 py-8 text-center text-brand-dark/50 font-medium">Faaliyet bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
