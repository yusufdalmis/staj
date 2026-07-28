"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, Building2, Calendar, Edit, FileText, Target, CheckCircle2 } from "lucide-react"
import { exportWordWeekly } from "@/lib/exportWordWeekly"
import { exportAnnualAsDesigned } from "@/lib/exportWordAnnual"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

export default function ReportViewClient({ initialData, currentUserRole, currentUserId }: { initialData: any, currentUserRole: string, currentUserId: string }) {
  const router = useRouter()
  const isWeekly = !initialData.isAnnual

  const handleExport = () => {
    if (isWeekly) {
      exportWordWeekly([initialData])
    } else {
      exportAnnualAsDesigned([initialData])
    }
  }

  const canEdit = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN' || currentUserId === initialData.userId

  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-brand-primary/5 via-white/80 to-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/50 shadow-sm sticky top-20 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-brand-primary hover:text-white text-brand-dark/70 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-lg border border-brand-primary/20">
                {isWeekly ? "Haftalık Faaliyet Raporu" : "Yıllık Ara Faaliyet Raporu"}
              </span>
              <span className="px-3 py-1 bg-brand-dark/5 text-brand-dark text-xs font-bold rounded-lg border border-brand-dark/10 flex items-center gap-1.5">
                <Building2 size={12} /> {initialData.unit || "Birim Belirtilmemiş"}
              </span>
              {initialData.subUnit && (
                <span className="px-3 py-1 bg-brand-dark/5 text-brand-dark text-xs font-bold rounded-lg border border-brand-dark/10 flex items-center gap-1.5">
                  {initialData.subUnit}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-brand-dark">
              {isWeekly ? `Haftalık Rapor - ${format(new Date(initialData.createdAt), "dd MMM yyyy", { locale: tr })}` : initialData.annualDetails?.sopName || "Yıllık Rapor"}
            </h1>
            <p className="text-sm font-medium text-brand-dark/60 mt-1">Ekleyen: {initialData.user?.name || initialData.user?.email || "-"}</p>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          {canEdit && (
            <Link 
              href={`/dashboard/rapor-duzenle/${initialData.id}`}
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
        
        {/* WEEKLY VIEW */}
        {isWeekly && (
          <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 p-8 space-y-8">
            <h2 className="text-xl font-extrabold text-brand-dark border-b border-brand-dark/10 pb-4 flex items-center gap-2">
              <FileText size={24} className="text-brand-primary" /> Gerçekleştirilen Faaliyetler
            </h2>
            
            <div className="space-y-8">
              {initialData.activities?.length > 0 ? initialData.activities.map((act: any, idx: number) => (
                <div key={idx} className="border border-brand-dark/10 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-5 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/30 to-transparent flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-brand-primary">{act.title || "İsimsiz Faaliyet"}</h3>
                      {act.projectRefNo && <p className="text-sm text-brand-dark/70 mt-1 font-medium">Proje Ref No: {act.projectRefNo}</p>}
                    </div>
                    <span className="px-3 py-1 bg-brand-dark/5 text-brand-dark font-bold text-xs rounded-lg">
                      {act.status || "Durum Belirtilmemiş"}
                    </span>
                  </div>
                  
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">Açıklama</h4>
                        <p className="text-sm font-medium text-brand-dark leading-relaxed whitespace-pre-wrap">{act.description || "-"}</p>
                      </div>
                      
                      {act.stakeholders && act.stakeholders.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-2">Paydaşlar</h4>
                          <div className="flex flex-wrap gap-2">
                            {act.stakeholders.map((sh: string) => (
                              <span key={sh} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">{sh}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {act.programType && (
                        <div>
                          <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">Bileşen Kodu</h4>
                          <p className="text-sm font-medium text-brand-dark">{act.programType}</p>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">Ortak Çalışılan Birimler</h4>
                        <p className="text-sm font-medium text-brand-dark bg-brand-light/30 p-3 rounded-xl border border-brand-dark/5">{act.nextStep || "-"}</p>
                      </div>
                    </div>
                    
                    {/* Photos */}
                    {(act.photo1 || act.photo2) && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">Görseller</h4>
                        <div className="grid grid-cols-2 gap-3 h-full max-h-48">
                          {act.photo1 ? (
                            <div className="rounded-xl overflow-hidden border border-brand-dark/10 shadow-sm h-48">
                              <img src={act.photo1} alt="Foto 1" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                          ) : <div />}
                          {act.photo2 ? (
                            <div className="rounded-xl overflow-hidden border border-brand-dark/10 shadow-sm h-48">
                              <img src={act.photo2} alt="Foto 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            </div>
                          ) : <div />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center p-8 text-brand-dark/50 font-medium">Bu rapora henüz faaliyet eklenmemiş.</div>
              )}
            </div>
          </div>
        )}

        {/* ANNUAL VIEW */}
        {!isWeekly && (
          <div className="space-y-8">
            
            {/* Genel Bilgiler */}
            <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
              <div className="p-6 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/50 to-transparent">
                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                  <FileText size={20} className="text-brand-primary" /> 
                  SOP Genel Bilgileri
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">SOP Adı</h4>
                  <p className="text-sm font-bold text-brand-dark">{initialData.annualDetails?.sopName || "-"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">SOP Referans No</h4>
                  <p className="text-sm font-bold text-brand-dark">{initialData.annualDetails?.sopRefNo || "-"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">Rapor Dönemi</h4>
                  <p className="text-sm font-bold text-brand-dark">{initialData.annualDetails?.reportPeriod || "-"}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">Bütçe</h4>
                  <p className="text-sm font-bold text-brand-dark">{initialData.annualDetails?.budget ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(initialData.annualDetails.budget) : "-"}</p>
                </div>
                <div className="lg:col-span-4">
                  <h4 className="text-xs font-bold text-brand-dark/50 uppercase tracking-wider mb-1">SOP Özeti</h4>
                  <p className="text-sm font-medium text-brand-dark bg-brand-light/30 p-4 rounded-xl border border-brand-dark/5">{initialData.annualDetails?.sopSummary || "-"}</p>
                </div>
              </div>
            </div>

            {/* Kapsam Takibi */}
            {initialData.annualDetails?.components?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
                <div className="p-6 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/50 to-transparent">
                  <h2 className="text-lg font-bold text-black flex items-center gap-2">
                    <Target size={20} className="text-brand-primary" /> 
                    Kapsam Takibi (Bileşenler)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-brand-light/30 text-black font-bold border-b border-brand-dark/10">
                      <tr>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Kategori</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Bileşen Adı</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Durum</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Gecikme Nedeni</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Dönem İlerlemesi</th>
                        <th className="px-4 py-3">Sonraki Plan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-dark/5">
                      {initialData.annualDetails.components.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-brand-light/10 transition-colors">
                          <td className="px-4 py-3 border-r border-brand-dark/5 font-medium text-brand-dark">{c.name || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{c.componentName || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5">
                            <span className="px-2 py-1 bg-brand-dark/5 rounded-lg font-bold text-xs">{c.status || "-"}</span>
                          </td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{c.delayReason || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{c.progress || "-"}</td>
                          <td className="px-4 py-3 text-black">{c.nextPeriodPlan || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sonuç Göstergeleri */}
            {initialData.annualDetails?.resultIndicators?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
                <div className="p-6 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/50 to-transparent">
                  <h2 className="text-lg font-bold text-black flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-brand-primary" /> 
                    Sonuç Göstergeleri
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-brand-light/30 text-black font-bold border-b border-brand-dark/10">
                      <tr>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Gösterge Adı</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Birim</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Başlangıç</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Hedef</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5 text-center">Dönem Değeri</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">İlgili Amaç</th>
                        <th className="px-4 py-3">Planlanan Dönem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-dark/5">
                      {initialData.annualDetails.resultIndicators.map((ind: any, idx: number) => (
                        <tr key={idx} className="hover:bg-brand-light/10 transition-colors">
                          <td className="px-4 py-3 border-r border-brand-dark/5 font-medium text-black">{ind.name || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{ind.unit || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{ind.initialValue || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black font-bold">{ind.target || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-center font-extrabold text-brand-primary bg-brand-primary/5">{ind.periodValue || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{ind.relatedGoal || "-"}</td>
                          <td className="px-4 py-3 text-black">{ind.targetPeriod || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Çıktı Göstergeleri */}
            {initialData.annualDetails?.outputIndicators?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
                <div className="p-6 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/50 to-transparent">
                  <h2 className="text-lg font-bold text-black flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-brand-primary" /> 
                    Çıktı Göstergeleri
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-brand-light/30 text-black font-bold border-b border-brand-dark/10">
                      <tr>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Gösterge Adı</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Bileşen Kodu</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Birim</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Hedef</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5 text-center">Dönem Değeri</th>
                        <th className="px-4 py-3">Planlanan Dönem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-dark/5">
                      {initialData.annualDetails.outputIndicators.map((ind: any, idx: number) => (
                        <tr key={idx} className="hover:bg-brand-light/10 transition-colors">
                          <td className="px-4 py-3 border-r border-brand-dark/5 font-medium text-black">{ind.name || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{ind.componentCode || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{ind.unit || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black font-bold">{ind.target || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-center font-extrabold text-brand-primary bg-brand-primary/5">{ind.periodValue || "-"}</td>
                          <td className="px-4 py-3 text-black">{ind.targetPeriod || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Kilometre Taşları */}
            {initialData.annualDetails?.milestones?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
                <div className="p-6 border-b border-brand-dark/5 bg-gradient-to-r from-brand-light/50 to-transparent">
                  <h2 className="text-lg font-bold text-black flex items-center gap-2">
                    <Calendar size={20} className="text-brand-primary" /> 
                    Kilometre Taşları (Eşik Noktaları)
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-brand-light/30 text-black font-bold border-b border-brand-dark/10">
                      <tr>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Eşik Noktası Adı</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Bileşen Kodu</th>
                        <th className="px-4 py-3 border-r border-brand-dark/5">Planlanan Tarih</th>
                        <th className="px-4 py-3">Gerçekleşen Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-dark/5">
                      {initialData.annualDetails.milestones.map((ms: any, idx: number) => (
                        <tr key={idx} className="hover:bg-brand-light/10 transition-colors">
                          <td className="px-4 py-3 border-r border-brand-dark/5 font-medium text-black">{ms.name || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black">{ms.componentCode || "-"}</td>
                          <td className="px-4 py-3 border-r border-brand-dark/5 text-black font-medium">{ms.plannedDate ? format(new Date(ms.plannedDate), "dd MMM yyyy", { locale: tr }) : "-"}</td>
                          <td className="px-4 py-3 text-brand-primary font-bold">{ms.actualDate ? format(new Date(ms.actualDate), "dd MMM yyyy", { locale: tr }) : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Değerlendirmeler & İyileştirme */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {initialData.annualDetails?.evaluations?.length > 0 && (
                <div className="bg-red-50/50 rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                  <div className="p-6 border-b border-red-100 bg-red-100/50">
                    <h2 className="text-lg font-bold text-red-800">Değerlendirme (Eksiklikler)</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {initialData.annualDetails.evaluations.map((ev: any, idx: number) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                        <h4 className="text-sm font-bold text-red-800 mb-1">{ev.section || "-"}</h4>
                        <p className="text-sm font-medium text-brand-dark">{ev.description || "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {initialData.annualDetails?.improvementSuggestions?.length > 0 && (
                <div className="bg-green-50/50 rounded-2xl shadow-sm border border-green-100 overflow-hidden">
                  <div className="p-6 border-b border-green-100 bg-green-100/50">
                    <h2 className="text-lg font-bold text-green-800">Çıkarılan Dersler & Öneriler</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {initialData.annualDetails.improvementSuggestions.map((sug: any, idx: number) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-green-100 shadow-sm space-y-3">
                        {sug.lessonLearned && (
                          <div>
                            <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md mb-1 inline-block">Çıkarılan Ders</span>
                            <p className="text-sm font-medium text-brand-dark">{sug.lessonLearned}</p>
                          </div>
                        )}
                        {sug.suggestion && (
                          <div>
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md mb-1 inline-block">Öneri</span>
                            <p className="text-sm font-medium text-brand-dark">{sug.suggestion}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
