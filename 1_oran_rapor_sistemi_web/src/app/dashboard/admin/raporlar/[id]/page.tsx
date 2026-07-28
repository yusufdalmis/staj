import EditReportClient from "../../../raporlarim/[id]/EditReportClient"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CheckCircle, XCircle, ArrowLeft, Calendar, FileText, Edit } from "lucide-react"
import Link from "next/link"

export default async function AdminRaporDetayPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const isEdit = resolvedSearchParams.edit === "true";
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect("/login")

  const report = await prisma.report.findUnique({
    where: { id: resolvedParams.id },
    include: {
      activities: true,
      annualDetails: {
        include: {
          components: true,
          resultIndicators: true,
          outputIndicators: true,
          milestones: true,
          evaluations: true,
          improvementSuggestions: true
        }
      },
      user: {
        select: { name: true, unit: true }
      }
    }
  })

  if (!report) redirect("/dashboard/admin/raporlar")

  if (isEdit) {
    if (session.user.role === "USER" && report.userId !== session.user.id) {
      redirect(`/dashboard/admin/raporlar/${report.id}`)
    }
    const rawSettings = await prisma.systemSetting.findMany();
    const lists = Object.fromEntries(rawSettings.map((s) => [s.key, JSON.parse(s.value)]));
    return <EditReportClient report={report} lists={lists} />;
  }


  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/admin/raporlar" 
          className="p-2 rounded-xl bg-white border border-brand-dark/10 text-brand-dark/70 hover:text-brand-primary hover:border-brand-primary/30 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-brand-dark">Rapor Detayı</h1>
            {(session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" || report.userId === session.user.id) && (
              <Link href={`/dashboard/admin/raporlar/${report.id}?edit=true`} className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg font-bold text-sm hover:bg-brand-primary hover:text-white transition-colors">
                <Edit size={16} /> Düzenle
              </Link>
            )}
          </div>
          <p className="text-brand-dark/70 text-sm mt-1">{report.user.name} - {report.unit}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Annual Details */}
          {report.isAnnual && report.annualDetails && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-primary/20">
              <h3 className="text-lg font-bold text-brand-primary border-b border-brand-primary/10 pb-2 mb-4">
                Yıllık Ara Rapor Bilgileri
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-xs font-bold text-brand-dark uppercase tracking-wider mb-1 opacity-70">SOP Adı</dt>
                  <dd className="font-bold text-brand-dark">{report.annualDetails.sopName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-brand-dark uppercase tracking-wider mb-1 opacity-70">SOP Ref No</dt>
                  <dd className="font-bold text-brand-dark">{report.annualDetails.sopRefNo || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-brand-dark uppercase tracking-wider mb-1 opacity-70">Bütçe</dt>
                  <dd className="font-bold text-brand-dark">{report.annualDetails.budget ? `${report.annualDetails.budget} TL` : "-"}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-xs font-bold text-brand-dark uppercase tracking-wider mb-1 opacity-70">Bileşenler ve İlerleme Durumu</dt>
                  <dd>
                    <div className="overflow-x-auto mt-2 rounded-xl border border-brand-dark/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-brand-light/50 border-b border-brand-dark/10">
                          <tr>
                            <th className="px-4 py-2 text-brand-dark">Bileşen Adı</th>
                            <th className="px-4 py-2 text-brand-dark">Durum</th>
                            <th className="px-4 py-2 text-brand-dark">Gecikme Nedeni</th>
                            <th className="px-4 py-2 text-brand-dark">İlerleme</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-dark/5">
                          {report.annualDetails.components.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-4 text-center text-brand-dark/50">Kayıtlı bileşen yok.</td></tr>
                          ) : (
                            report.annualDetails.components.map((comp: any) => (
                              <tr key={comp.id} className="hover:bg-brand-light/10">
                                <td className="px-4 py-3 font-medium text-brand-dark">{comp.name}</td>
                                <td className="px-4 py-3 text-brand-dark">{comp.status || "-"}</td>
                                <td className="px-4 py-3 text-brand-dark">{comp.delayReason || "-"}</td>
                                <td className="px-4 py-3 text-brand-dark">{comp.progress || "-"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </dd>
                </div>

                <div className="md:col-span-2">
                  <dt className="text-xs font-bold text-brand-dark uppercase tracking-wider mb-1 opacity-70">SOP Özeti</dt>
                  <dd className="text-brand-dark font-medium">{report.annualDetails.sopSummary || "-"}</dd>
                </div>
              </dl>
            </div>
          )}

          {report.isAnnual && report.annualDetails && report.annualDetails.resultIndicators.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-primary/20">
              <h3 className="text-lg font-bold text-brand-primary border-b border-brand-primary/10 pb-2 mb-4">Sonuç Göstergeleri</h3>
              <div className="overflow-x-auto rounded-xl border border-brand-dark/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-light/50 border-b border-brand-dark/10">
                    <tr>
                      <th className="px-4 py-2">Gösterge Adı</th>
                      <th className="px-4 py-2">Birim</th>
                      <th className="px-4 py-2">Başlangıç</th>
                      <th className="px-4 py-2">Hedef</th>
                      <th className="px-4 py-2">Dönem Değeri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-dark/5">
                    {report.annualDetails.resultIndicators.map((ind: any) => (
                      <tr key={ind.id}>
                        <td className="px-4 py-3 font-medium text-brand-dark">{ind.name}</td>
                        <td className="px-4 py-3 text-brand-dark">{ind.unit || "-"}</td>
                        <td className="px-4 py-3 text-brand-dark">{ind.initialValue || "-"}</td>
                        <td className="px-4 py-3 text-brand-dark">{ind.target || "-"}</td>
                        <td className="px-4 py-3 text-brand-dark">{ind.periodValue || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Weekly Activities */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-dark/5">
            <h3 className="text-lg font-bold text-brand-dark border-b border-brand-dark/10 pb-2 mb-4">
              Haftalık Faaliyetler
            </h3>
            {report.activities.length === 0 ? (
              <p className="text-brand-dark font-medium opacity-80">Faaliyet bulunmuyor.</p>
            ) : (
              <div className="space-y-6">
                {report.activities.map((act, index) => (
                  <div key={act.id} className="p-5 border border-brand-dark/10 bg-brand-light/10 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <h4 className="font-bold text-brand-dark text-lg">Faaliyet Detayı</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {act.projectRefNo && (
                        <div className="bg-white p-3 rounded-xl border border-brand-dark/5">
                          <p className="text-xs font-bold text-brand-dark opacity-60 mb-1">Proje Referans No</p>
                          <p className="font-bold text-brand-dark">{act.projectRefNo}</p>
                        </div>
                      )}
                      {act.programType && (
                        <div className="bg-white p-3 rounded-xl border border-brand-dark/5">
                          <p className="text-xs font-bold text-brand-dark opacity-60 mb-1">Destek / Program Türü</p>
                          <p className="font-bold text-brand-dark">{act.programType}</p>
                        </div>
                      )}
                      {act.stakeholders && act.stakeholders.length > 0 && (
                        <div className="bg-white p-3 rounded-xl border border-brand-dark/5 md:col-span-2">
                          <p className="text-xs font-bold text-brand-dark opacity-60 mb-1">Paydaşlar</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {act.stakeholders.map((s, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="bg-white p-3 rounded-xl border border-brand-dark/5 md:col-span-2">
                        <p className="text-xs font-bold text-brand-dark opacity-60 mb-1">Faaliyet Özeti</p>
                        <p className="font-medium text-brand-dark text-sm leading-relaxed">{act.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {act.photo1 && (
                        <div className="rounded-xl overflow-hidden border border-brand-dark/10 bg-white">
                          <img src={act.photo1} alt="Faaliyet Fotoğrafı 1" className="w-full h-48 object-cover hover:scale-105 transition-transform" />
                        </div>
                      )}
                      {act.photo2 && (
                        <div className="rounded-xl overflow-hidden border border-brand-dark/10 bg-white">
                          <img src={act.photo2} alt="Faaliyet Fotoğrafı 2" className="w-full h-48 object-cover hover:scale-105 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info & Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-dark/5">
            <h3 className="font-bold text-brand-dark mb-4">Rapor Bilgileri</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-brand-dark/5">
                <span className="text-brand-dark font-bold opacity-70 text-sm">Tarih</span>
                <span className="text-brand-dark font-bold text-sm flex items-center gap-1.5">
                  <Calendar size={14} />
                  {new Date(report.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-brand-dark/5">
                <span className="text-brand-dark font-bold opacity-70 text-sm">Tip</span>
                <span className="text-brand-dark font-bold text-sm flex items-center gap-1.5">
                  <FileText size={14} />
                  {report.isAnnual ? "Yıllık" : "Haftalık"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
