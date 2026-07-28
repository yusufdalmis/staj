"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useDialog } from "@/components/DialogProvider"
import { Save, Plus, Trash2, Loader2, Image as ImageIcon, X } from "lucide-react"
import ImageCropperModal from "@/components/ImageCropperModal"
import { COMPONENT_CODES } from "@/constants/componentCodes"

type FormValues = {
  reportType: "WEEKLY" | "ANNUAL" | "WORK_PROGRAM"
  unit: string
  subUnit: string
  
  // Work Program fields
  wpName: string
  wpYear: number | null
  wpDescription: string
  // Annual fields
  sopName: string
  sopRefNo: string
  reportPeriod: string
  budget: number
  sopDurationYear: number | null
  sopDurationMonth: number | null
  sopSummary: string
  components: { name: string; componentName: string; status: string; delayReason: string; progress: string; nextPeriodPlan: string }[]
  resultIndicators: { name: string; unit: string; initialValue: string; target: string; periodValue: string; relatedGoal: string; targetPeriod: string }[]
  outputIndicators: { name: string; componentCode: string; unit: string; target: string; periodValue: string; targetPeriod: string }[]
  milestones: { name: string; componentCode: string; plannedDate: string; actualDate: string }[]
  evaluations: { section: string; description: string }[]
  improvementSuggestions: { lessonLearned: string; suggestion: string; relatedSopArea: string }[]
  // Weekly fields
  activities: { 
    title: string
    description: string
    projectRefNo: string
    programType: string
    stakeholders: string | string[]
    status: string
    nextStep: string
    photo1: string
    photo2: string 
  }[]
}

export default function EditReportClient({ initialData, currentUserRole, currentUserId, isReadOnly = false }: { initialData: any, currentUserRole: string, currentUserId: string, isReadOnly?: boolean }) {
  const { data: session } = useSession()
  const router = useRouter()
  const dialog = useDialog()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dynamic lists from DB
  const [lists, setLists] = useState<Record<string, string[]>>({
    UNITS: [], SUB_UNITS: [], SOPS: [], PROGRAM_TYPES: [], COMPONENTS: [], CONTACTED_INSTITUTIONS: []
  })
  const [listsLoading, setListsLoading] = useState(true)

  // Cropper State
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [currentImageToCrop, setCurrentImageToCrop] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<{ index: number, photoKey: "photo1" | "photo2" } | null>(null)

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      reportType: initialData.isAnnual ? "ANNUAL" : "WEEKLY",
      unit: initialData.unit || "",
      subUnit: initialData.unit !== "Yatırım Destek Ofisi Faaliyetleri (YDO)" ? "" : "", // Simplify
      wpName: "",
      wpYear: new Date().getFullYear(),
      wpDescription: "",
      sopDurationYear: initialData.annualDetails?.sopDuration ? parseInt(initialData.annualDetails.sopDuration.split(" ")[0]) : null,
      sopDurationMonth: initialData.annualDetails?.sopDuration && initialData.annualDetails.sopDuration.includes("Ay") ? parseInt(initialData.annualDetails.sopDuration.split(" ").slice(-2)[0]) : null,
      components: initialData.annualDetails?.components?.length ? initialData.annualDetails.components : [{ name: "", componentName: "", status: "", delayReason: "", progress: "", nextPeriodPlan: "" }],
      resultIndicators: initialData.annualDetails?.resultIndicators?.length ? initialData.annualDetails.resultIndicators : [],
      outputIndicators: initialData.annualDetails?.outputIndicators?.length ? initialData.annualDetails.outputIndicators : [],
      milestones: initialData.annualDetails?.milestones?.length ? initialData.annualDetails.milestones : [],
      evaluations: initialData.annualDetails?.evaluations?.length ? initialData.annualDetails.evaluations : [],
      improvementSuggestions: initialData.annualDetails?.improvementSuggestions?.length ? initialData.annualDetails.improvementSuggestions : [],
      activities: initialData.activities?.length ? initialData.activities.map((act: any) => ({
        ...act,
        stakeholders: act.stakeholders || []
      })) : [{ title: "", description: "", projectRefNo: "", programType: "", stakeholders: [], status: "", nextStep: "", photo1: "", photo2: "" }],
      // Add more annual details fields
      sopName: initialData.annualDetails?.sopName || "",
      sopRefNo: initialData.annualDetails?.sopRefNo || "",
      reportPeriod: initialData.annualDetails?.reportPeriod || "",
      budget: initialData.annualDetails?.budget || null,
      sopSummary: initialData.annualDetails?.sopSummary || "",
    }
  })

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setLists(data)
        if (!initialData.unit && session?.user?.unit && data.UNITS?.includes(session.user.unit)) {
          setValue("unit", session.user.unit)
        } else if (initialData.unit) {
          if (data.SUB_UNITS?.includes(initialData.unit)) {
            setValue("unit", "Yatırım Destek Ofisi Faaliyetleri (YDO)")
            setValue("subUnit", initialData.unit)
          } else {
            setValue("unit", initialData.unit)
          }
        }
      })
      .catch(console.error)
      .finally(() => setListsLoading(false))
  }, [session, setValue])

  const reportType = watch("reportType")
  const unit = watch("unit")
  const activities = watch("activities")

  // Field Arrays
  const compArray = useFieldArray({ control, name: "components" })
  const resIndArray = useFieldArray({ control, name: "resultIndicators" })
  const outIndArray = useFieldArray({ control, name: "outputIndicators" })
  const milArray = useFieldArray({ control, name: "milestones" })
  const evalArray = useFieldArray({ control, name: "evaluations" })
  const impArray = useFieldArray({ control, name: "improvementSuggestions" })
  const actArray = useFieldArray({ control, name: "activities" })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number, photoKey: "photo1" | "photo2") => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.addEventListener("load", () => {
        setCurrentImageToCrop(reader.result?.toString() || null)
        setCropTarget({ index, photoKey })
        setCropModalOpen(true)
      })
      reader.readAsDataURL(file)
      // Reset input so same file can be selected again
      e.target.value = ""
    }
  }

  const handleCropComplete = (croppedBase64: string) => {
    if (cropTarget) {
      setValue(`activities.${cropTarget.index}.${cropTarget.photoKey}`, croppedBase64)
    }
    setCropModalOpen(false)
    setCurrentImageToCrop(null)
    setCropTarget(null)
  }

  const onSubmit = async (data: FormValues) => {
    // Photo validation removed

    setIsSubmitting(true)
    try {
      const finalUnit = data.unit === "Yatırım Destek Ofisi Faaliyetleri (YDO)" ? data.subUnit : data.unit
      
      if (data.reportType === "WORK_PROGRAM") {
        const wpPayload = {
          name: data.wpName,
          year: data.wpYear,
          unit: finalUnit,
          description: data.wpDescription
        }
        const res = await fetch("/api/admin/work-programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wpPayload)
        })
        if (res.ok) {
          router.push("/dashboard/calisma-programlari")
        } else {
          dialog.alert("Çalışma programı kaydedilirken bir hata oluştu.")
        }
        setIsSubmitting(false)
        return
      }

      let durationStr = [];
      if (data.sopDurationYear !== null && data.sopDurationYear !== undefined && !isNaN(data.sopDurationYear)) durationStr.push(`${data.sopDurationYear} Yıl`);
      if (data.sopDurationMonth !== null && data.sopDurationMonth !== undefined && !isNaN(data.sopDurationMonth)) durationStr.push(`${data.sopDurationMonth} Ay`);
      const finalDuration = durationStr.join(" ");

      const payload = {
        ...data,
        isAnnual: data.reportType === "ANNUAL",
        sopDuration: finalDuration,
        unit: finalUnit,
        activities: data.reportType === "WEEKLY" ? data.activities.map((act: any) => ({
            title: act.title,
            description: act.description,
            projectRefNo: act.projectRefNo,
            programType: act.programType,
            status: act.status,
            nextStep: act.nextStep,
            photo1: act.photo1,
            photo2: act.photo2,
            stakeholders: Array.isArray(act.stakeholders) ? act.stakeholders : (act.stakeholders ? String(act.stakeholders).split(",").map(s => s.trim()).filter(Boolean) : [])
        })) : undefined
      }

      const res = await fetch(`/api/reports/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        router.push(data.reportType === "ANNUAL" ? "/dashboard/yillik-faaliyetler" : "/dashboard/haftalik-faaliyetler")
      } else {
        dialog.alert("Rapor kaydedilirken bir hata oluştu.")
      }
    } catch (error) {
      console.error(error)
      dialog.alert("Sistemsel bir hata oluştu.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (listsLoading) {
    return <div className="p-12 text-center font-bold text-brand-dark opacity-50">Sayfa Yükleniyor...</div>
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-16 md:pt-4 pb-20">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-20">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-brand-dark/5">
          <div>
            <h1 className="text-2xl font-extrabold text-brand-dark">
              {isReadOnly ? (reportType === "ANNUAL" ? "Yıllık Ara Faaliyet İncele" : "Haftalık Faaliyet İncele") : "Rapor Düzenle"}
            </h1>
            <p className="text-sm font-medium text-brand-dark/60 mt-1">
              {isReadOnly ? "Raporun güncel durumunu görüntülüyorsunuz." : "Rapor türü değiştirilemez."}
            </p>
          </div>
          {isReadOnly && (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/rapor-duzenle/${initialData.id}`)}
              className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-colors"
            >
              Düzenle
            </button>
          )}
        </div>

        <fieldset disabled={isReadOnly} className="space-y-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-dark/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-brand-light/50 border border-brand-dark/10 mb-6 gap-4">
              <div>
                <h3 className="font-bold text-brand-dark">Rapor Türü Seçimi</h3>
                <p className="text-sm font-medium text-brand-dark opacity-70">Girmek istediğiniz rapor türünü seçiniz.</p>
              </div>
              
              <div className="flex bg-brand-dark/10 p-1 rounded-xl w-full md:w-auto overflow-x-auto min-w-0 opacity-70 pointer-events-none">
                <button 
                  type="button" 
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${reportType === "WEEKLY" ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-dark/70'}`}
                >
                  Haftalık Faaliyet
                </button>
                <button 
                  type="button" 
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${reportType === "ANNUAL" ? 'bg-white shadow-sm text-brand-primary' : 'text-brand-dark/70'}`}
                >
                  Yıllık Ara Rapor
                </button>
              </div>
            </div>

            {(reportType === "WEEKLY" || reportType === "WORK_PROGRAM") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-1">Birim Seçimi <span className="text-brand-primary">*</span></label>
                  <select 
                    {...register("unit", { required: "Birim seçimi zorunludur" })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark"
                  >
                    <option value="">Seçiniz...</option>
                    {(lists.UNITS || []).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {errors.unit && <p className="text-red-500 text-xs font-medium mt-1">{errors.unit.message}</p>}
                </div>
                
                {unit === "Yatırım Destek Ofisi Faaliyetleri (YDO)" && (
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-1">İl / Ofis Seçimi <span className="text-brand-primary">*</span></label>
                    <select 
                      {...register("subUnit", { required: "YDO için alt ofis seçimi zorunludur" })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark"
                    >
                      <option value="">Seçiniz...</option>
                      {(lists.SUB_UNITS || []).map(su => <option key={su} value={su}>{su}</option>)}
                    </select>
                    {errors.subUnit && <p className="text-red-500 text-xs font-medium mt-1">{errors.subUnit.message}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ANNUAL FIELDS */}
          {reportType === "ANNUAL" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-primary/20 space-y-8 animate-in zoom-in-95 duration-300">
              <h3 className="text-lg font-bold text-brand-primary border-b border-brand-primary/10 pb-2">Yıllık Ara Rapor Detayları</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-brand-dark mb-1">SOP Adı <span className="text-brand-primary">*</span></label>
                  <select 
                    {...register("sopName", { required: reportType === "ANNUAL" ? "SOP seçimi zorunludur" : false })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark"
                  >
                    <option value="">Seçiniz...</option>
                    {(lists.SOPS || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-1">SOP Referans No</label>
                  <input type="text" {...register("sopRefNo")} className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-1">Rapor Dönemi</label>
                  <input type="text" {...register("reportPeriod")} className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-1">SOP Bütçesi (TL)</label>
                  <input type="number" step="0.01" min="0" {...register("budget", { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark" />
                </div>
                
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-bold text-brand-dark mb-1">SOP Süresi (Yıl)</label>
                    <input type="number" min="0" {...register("sopDurationYear", { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark" />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-bold text-brand-dark mb-1">SOP Süresi (Ay)</label>
                    <input type="number" min="0" max="1000" {...register("sopDurationMonth", { valueAsNumber: true })} className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-medium text-brand-dark" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-brand-dark mb-1">SOP Özeti</label>
                  <textarea rows={3} {...register("sopSummary")} className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all resize-none font-medium text-brand-dark" />
                </div>
              </div>

              {/* KAPSAM TAKİBİ */}
              <div className="border border-brand-dark/10 rounded-xl overflow-hidden">
                <div className="bg-brand-light/30 p-4 border-b border-brand-dark/10 flex justify-between items-center">
                  <h4 className="font-bold text-brand-dark">Kapsam Takibi (Bileşenler)</h4>
                  <button type="button" onClick={() => compArray.append({ name: "", componentName: "", status: "", delayReason: "", progress: "", nextPeriodPlan: "" })} className="text-sm font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1">
                    <Plus size={16} /> Satır Ekle
                  </button>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  {compArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-brand-dark/10 rounded-lg relative">
                      <button type="button" onClick={() => compArray.remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Bileşen Kategorisi</label>
                        <select {...register(`components.${index}.name` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark outline-none focus:border-brand-primary">
                          <option value="">Seçiniz...</option>
                          {(lists.COMPONENTS || []).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Bileşen Adı</label>
                        <input type="text" {...register(`components.${index}.componentName` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" placeholder="Örn: Proje veya Faaliyet Adı" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Durum</label>
                        <select {...register(`components.${index}.status` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark outline-none focus:border-brand-primary">
                          <option value="">Seçiniz...</option>
                          {(lists.COMPONENT_STATUSES && lists.COMPONENT_STATUSES.length > 0 ? lists.COMPONENT_STATUSES : ["Zamanında Tamamlandı", "Gecikme ile Tamamlandı", "Devam Ediyor", "Başlamadı"]).map((s: string) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-brand-dark mb-1">Gecikme Nedeni</label>
                        <input type="text" {...register(`components.${index}.delayReason` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-brand-dark mb-1">Dönem İlerlemesi</label>
                        <textarea rows={2} {...register(`components.${index}.progress` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-brand-dark mb-1">Sonraki Dönem Yapılacaklar</label>
                        <textarea rows={2} {...register(`components.${index}.nextPeriodPlan` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" placeholder="Gelecek dönem için planlanan faaliyetler..." />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SONUÇ GÖSTERGELERİ */}
              <div className="border border-brand-dark/10 rounded-xl overflow-hidden">
                <div className="bg-brand-light/30 p-4 border-b border-brand-dark/10 flex justify-between items-center">
                  <h4 className="font-bold text-brand-dark">Sonuç Göstergeleri</h4>
                  <button type="button" onClick={() => resIndArray.append({ name: "", unit: "", initialValue: "", target: "", periodValue: "", relatedGoal: "", targetPeriod: "" })} className="text-sm font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1">
                    <Plus size={16} /> Gösterge Ekle
                  </button>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  {resIndArray.fields.length === 0 && <p className="text-sm text-brand-dark opacity-50 italic">Henüz gösterge eklenmedi.</p>}
                  {resIndArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-brand-dark/10 rounded-lg relative">
                      <button type="button" onClick={() => resIndArray.remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-brand-dark mb-1">Gösterge Adı</label>
                        <input type="text" {...register(`resultIndicators.${index}.name` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Birim</label>
                        <input type="text" {...register(`resultIndicators.${index}.unit` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Başlangıç</label>
                        <input type="text" {...register(`resultIndicators.${index}.initialValue` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Hedef</label>
                        <input type="text" {...register(`resultIndicators.${index}.target` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Dönem Değeri</label>
                        <input type="text" {...register(`resultIndicators.${index}.periodValue` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">İlgili Özel Amaç(lar) #</label>
                        <input type="text" {...register(`resultIndicators.${index}.relatedGoal` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Planlanan Tamamlanma Dönemi</label>
                        <input type="text" {...register(`resultIndicators.${index}.targetPeriod` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ÇIKTI GÖSTERGELERİ */}
              <div className="border border-brand-dark/10 rounded-xl overflow-hidden">
                <div className="bg-brand-light/30 p-4 border-b border-brand-dark/10 flex justify-between items-center">
                  <h4 className="font-bold text-brand-dark">Çıktı Göstergeleri</h4>
                  <button type="button" onClick={() => outIndArray.append({ name: "", componentCode: "", unit: "", target: "", periodValue: "", targetPeriod: "" })} className="text-sm font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1">
                    <Plus size={16} /> Gösterge Ekle
                  </button>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  {outIndArray.fields.length === 0 && <p className="text-sm text-brand-dark opacity-50 italic">Henüz gösterge eklenmedi.</p>}
                  {outIndArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-brand-dark/10 rounded-lg relative">
                      <button type="button" onClick={() => outIndArray.remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Gösterge Adı</label>
                        <input type="text" {...register(`outputIndicators.${index}.name` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Bileşen Kodu</label>
                        <select {...register(`outputIndicators.${index}.componentCode` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark outline-none focus:border-brand-primary">
                          <option value="">Seçiniz...</option>
                          {(lists.PROGRAM_TYPES?.length ? lists.PROGRAM_TYPES : COMPONENT_CODES).map(code => <option key={code} value={code}>{code}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Birim</label>
                        <input type="text" {...register(`outputIndicators.${index}.unit` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Planlanan Hedef</label>
                        <input type="text" {...register(`outputIndicators.${index}.target` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Dönem Değeri</label>
                        <input type="text" {...register(`outputIndicators.${index}.periodValue` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Planlanan Tamamlanma Dönemi</label>
                        <input type="text" {...register(`outputIndicators.${index}.targetPeriod` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KİLOMETRE TAŞLARI */}
              <div className="border border-brand-dark/10 rounded-xl overflow-hidden">
                <div className="bg-brand-light/30 p-4 border-b border-brand-dark/10 flex justify-between items-center">
                  <h4 className="font-bold text-brand-dark">Kilometre Taşları (Eşik Noktaları)</h4>
                  <button type="button" onClick={() => milArray.append({ name: "", componentCode: "", plannedDate: "", actualDate: "" })} className="text-sm font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1">
                    <Plus size={16} /> Kilometre Taşı Ekle
                  </button>
                </div>
                <div className="p-4 space-y-4 bg-white">
                  {milArray.fields.length === 0 && <p className="text-sm text-brand-dark opacity-50 italic">Henüz kilometre taşı eklenmedi.</p>}
                  {milArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-brand-dark/10 rounded-lg relative">
                      <button type="button" onClick={() => milArray.remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Eşik Noktası Adı</label>
                        <input type="text" {...register(`milestones.${index}.name` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">İlgili Bileşen Kodu</label>
                        <input type="text" {...register(`milestones.${index}.componentCode` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Planlanan Tarih</label>
                        <input type="date" {...register(`milestones.${index}.plannedDate` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Gerçekleşen Tarih</label>
                        <input type="date" {...register(`milestones.${index}.actualDate` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DEĞERLENDİRME */}
              <div className="border border-brand-dark/10 rounded-xl overflow-hidden bg-brand-light/10">
                <div className="bg-brand-primary/10 p-4 border-b border-brand-primary/20 flex justify-between items-center">
                  <h4 className="font-bold text-brand-primary">Değerlendirme (Eksik Gerçekleşmeler, Sorunlar)</h4>
                  <button type="button" onClick={() => evalArray.append({ section: "", description: "" })} className="text-sm font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1">
                    <Plus size={16} /> Ekle
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {evalArray.fields.length === 0 && <p className="text-sm text-brand-dark opacity-50 italic">Henüz değerlendirme eklenmedi.</p>}
                  {evalArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 gap-4 p-4 border border-brand-dark/10 bg-white rounded-lg relative">
                      <button type="button" onClick={() => evalArray.remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Bölüm (Sonuç Göstergeleri, Çıktı vb.)</label>
                        <input type="text" {...register(`evaluations.${index}.section` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Değerlendirmeler</label>
                        <textarea rows={2} {...register(`evaluations.${index}.description` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark resize-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* İYİLEŞTİRME ÖNERİLERİ */}
              <div className="border border-brand-dark/10 rounded-xl overflow-hidden bg-brand-light/10">
                <div className="bg-brand-primary/10 p-4 border-b border-brand-primary/20 flex justify-between items-center">
                  <h4 className="font-bold text-brand-primary">Çıkarılan Dersler ve İyileştirme Önerileri</h4>
                  <button type="button" onClick={() => impArray.append({ lessonLearned: "", suggestion: "", relatedSopArea: "" })} className="text-sm font-bold text-brand-primary hover:text-brand-secondary flex items-center gap-1">
                    <Plus size={16} /> Ekle
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {impArray.fields.length === 0 && <p className="text-sm text-brand-dark opacity-50 italic">Henüz öneri eklenmedi.</p>}
                  {impArray.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-brand-dark/10 bg-white rounded-lg relative">
                      <button type="button" onClick={() => impArray.remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-brand-dark mb-1">Çıkarılan Ders</label>
                        <textarea rows={3} {...register(`improvementSuggestions.${index}.lessonLearned` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark resize-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-brand-dark mb-1">Önerilen İyileştirme</label>
                        <textarea rows={3} {...register(`improvementSuggestions.${index}.suggestion` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark resize-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-brand-dark mb-1">İlgili SOP Yönetim Alanı</label>
                        <textarea rows={3} {...register(`improvementSuggestions.${index}.relatedSopArea` as const)} className="w-full p-2 border border-brand-dark/20 rounded-lg text-sm text-brand-dark resize-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* WEEKLY FIELDS */}
          {reportType === "WEEKLY" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-dark/5 space-y-6">
              <div className="flex justify-between items-center border-b border-brand-dark/10 pb-3">
                <h3 className="text-lg font-bold text-brand-dark">Haftalık Faaliyet Raporu</h3>
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg">Temel Kısım</span>
              </div>
              
              <div className="space-y-6">
                {actArray.fields.map((field, index) => (
                  <div key={field.id} className="p-5 border border-brand-dark/10 bg-brand-light/10 rounded-2xl relative space-y-4">
                    <div className="flex justify-between items-center border-b border-brand-dark/5 pb-2">
                      <h4 className="font-bold text-brand-primary">Faaliyet {index + 1}</h4>
                      {actArray.fields.length > 1 && (
                        <button type="button" onClick={() => actArray.remove(index)} className="text-red-500 bg-red-50 p-1.5 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Faaliyet Adı / Konusu <span className="text-brand-primary">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Örn: Erciyes Zirvesi Toplantısı"
                          {...register(`activities.${index}.title` as const, { required: "Faaliyet adı zorunludur" })} 
                          className="w-full p-2.5 bg-white border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary" 
                        />
                        {errors.activities?.[index]?.title && (
                          <p className="text-red-500 text-xs mt-1">{errors.activities[index]?.title?.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Proje Referans Numarası (Opsiyonel)</label>
                        <input 
                          type="text" 
                          placeholder="Örn: TR72/26/SGR"
                          {...register(`activities.${index}.projectRefNo` as const)} 
                          className="w-full p-2.5 bg-white border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Bileşen Kodu (Opsiyonel)</label>
                        <select 
                          {...register(`activities.${index}.programType` as const)} 
                          className="w-full p-2.5 bg-white border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
                        >
                          <option value="">Seçiniz...</option>
                          {(lists.PROGRAM_TYPES?.length ? lists.PROGRAM_TYPES : COMPONENT_CODES).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-brand-dark mb-2">Temas Edilen Kurum/Paydaşlar (Opsiyonel)</label>
                        <div className="p-3 bg-white border border-brand-dark/20 rounded-xl focus-within:border-brand-primary transition-colors min-h-[50px]">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {Array.isArray(activities[index]?.stakeholders) && activities[index].stakeholders.map((sh: string) => (
                              <div key={sh} className="flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-lg text-sm font-bold border border-brand-primary/20">
                                {sh}
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const newArray = (activities[index].stakeholders as unknown as string[]).filter(s => s !== sh)
                                    setValue(`activities.${index}.stakeholders`, newArray, { shouldValidate: true })
                                  }}
                                  className="text-brand-primary/60 hover:text-red-500 hover:bg-red-50 p-0.5 rounded-md transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <select 
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              const current = Array.isArray(activities[index]?.stakeholders) ? activities[index].stakeholders : [];
                              if (!current.includes(val)) {
                                 setValue(`activities.${index}.stakeholders`, [...(current as unknown as string[]), val], { shouldValidate: true })
                              }
                            }}
                            className="w-full bg-transparent text-sm font-medium text-brand-dark outline-none py-1" 
                          >
                            <option value="">+ Listeden Kurum/Paydaş Seçin...</option>
                            {(lists.CONTACTED_INSTITUTIONS || [])
                              .filter(inst => !(activities[index]?.stakeholders || []).includes(inst))
                              .map(inst => <option key={inst} value={inst}>{inst}</option>)}
                          </select>
                        </div>
                        <input type="hidden" {...register(`activities.${index}.stakeholders` as const)} />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Mevcut Durum / Aşama <span className="text-brand-primary">*</span></label>
                        <select 
                          {...register(`activities.${index}.status` as const, { required: "Durum seçimi zorunludur" })} 
                          className="w-full p-2.5 bg-white border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
                        >
                          <option value="">Seçiniz...</option>
                          <option value="Planlanıyor">Planlanıyor</option>
                          <option value="Devam Ediyor">Devam Ediyor</option>
                          <option value="Tamamlandı">Tamamlandı</option>
                          <option value="İptal Edildi">İptal Edildi</option>
                        </select>
                        {errors.activities?.[index]?.status && (
                          <p className="text-red-500 text-xs mt-1">{errors.activities[index]?.status?.message}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-brand-dark mb-2">Ortak Çalışılan Birimler (Opsiyonel)</label>
                        <div className="p-3 bg-white border border-brand-dark/20 rounded-xl focus-within:border-brand-primary transition-colors min-h-[50px]">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {(typeof activities[index]?.nextStep === "string" && activities[index].nextStep
                              ? activities[index].nextStep.split(",").map((s: string) => s.trim()).filter(Boolean)
                              : []
                            ).map((unitName: string) => (
                              <div key={unitName} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-blue-200">
                                {unitName}
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const current = typeof activities[index]?.nextStep === "string"
                                      ? activities[index].nextStep.split(",").map((s: string) => s.trim()).filter(Boolean)
                                      : [];
                                    const updated = current.filter((u: string) => u !== unitName);
                                    setValue(`activities.${index}.nextStep`, updated.join(", "), { shouldValidate: true });
                                  }}
                                  className="text-blue-700/60 hover:text-red-500 hover:bg-red-50 p-0.5 rounded-md transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <select 
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              const current = typeof activities[index]?.nextStep === "string"
                                ? activities[index].nextStep.split(",").map((s: string) => s.trim()).filter(Boolean)
                                : [];
                              if (!current.includes(val)) {
                                setValue(`activities.${index}.nextStep`, [...current, val].join(", "), { shouldValidate: true });
                              }
                            }}
                            className="w-full bg-transparent text-sm font-medium text-brand-dark outline-none py-1 cursor-pointer" 
                          >
                            <option value="">+ Listeden Ortak Çalışılan Birim Seçin...</option>
                            {Array.from(new Set([...(lists.UNITS || []), ...(lists.SUB_UNITS || [])]))
                              .filter((u: string) => !(typeof activities[index]?.nextStep === "string" ? activities[index].nextStep.split(",").map((s: string) => s.trim()).filter(Boolean) : []).includes(u))
                              .map((u: string) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <input type="hidden" {...register(`activities.${index}.nextStep` as const)} />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-brand-dark mb-1">Faaliyet Özeti / Açıklaması <span className="text-brand-primary">*</span></label>
                        <textarea 
                          {...register(`activities.${index}.description` as const, { required: "Faaliyet açıklaması zorunludur" })}
                          placeholder="Gerçekleştirilen toplantılar, ziyaretler vb. detaylıca açıklayın..."
                          rows={3}
                          className="w-full p-2.5 bg-white border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary resize-none"
                        />
                        {errors.activities?.[index]?.description && (
                          <p className="text-red-500 text-xs mt-1">{errors.activities[index]?.description?.message}</p>
                        )}
                      </div>

                      <div className="md:col-span-2 pt-2">
                        <label className="block text-xs font-bold text-brand-dark mb-2">Faaliyet Görselleri (Opsiyonel)</label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative group">
                            <input type="file" id={`photo1-${index}`} accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, index, "photo1")} />
                            <label htmlFor={`photo1-${index}`} className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-brand-dark/20 rounded-xl bg-white cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition-all overflow-hidden relative">
                              {activities[index]?.photo1 ? (
                                <img src={activities[index].photo1} alt="Foto 1" className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <ImageIcon size={24} className="text-brand-dark/40 mb-2" />
                                  <span className="text-xs font-bold text-brand-dark/60">Fotoğraf 1 Yükle</span>
                                </>
                              )}
                            </label>
                          </div>

                          <div className="relative group">
                            <input type="file" id={`photo2-${index}`} accept="image/*" className="hidden" onChange={(e) => handleImageSelect(e, index, "photo2")} />
                            <label htmlFor={`photo2-${index}`} className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-brand-dark/20 rounded-xl bg-white cursor-pointer hover:border-brand-primary hover:bg-brand-primary/5 transition-all overflow-hidden relative">
                              {activities[index]?.photo2 ? (
                                <img src={activities[index].photo2} alt="Foto 2" className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <ImageIcon size={24} className="text-brand-dark/40 mb-2" />
                                  <span className="text-xs font-bold text-brand-dark/60">Fotoğraf 2 Yükle</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => actArray.append({ title: "", description: "", projectRefNo: "", programType: "", stakeholders: [], status: "", nextStep: "", photo1: "", photo2: "" })}
                  className="flex items-center gap-2 mt-4 text-sm font-bold text-brand-primary hover:text-brand-secondary transition-colors px-4 py-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20"
                >
                  <Plus size={18} /> Yeni Faaliyet Ekle
                </button>
              )}
            </div>
          )}

          {/* WORK PROGRAM FIELDS */}
          {reportType === "WORK_PROGRAM" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-primary/20 space-y-6 animate-in zoom-in-95 duration-300">
              <h3 className="text-lg font-bold text-brand-primary border-b border-brand-primary/10 pb-2">Çalışma Programı Bilgileri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-brand-dark mb-1">Program Adı <span className="text-brand-primary">*</span></label>
                  <input 
                    type="text" 
                    {...register("wpName", { required: reportType === "WORK_PROGRAM" ? "Program Adı zorunludur" : false })} 
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary outline-none transition-all font-medium text-brand-dark" 
                  />
                  {errors.wpName && <p className="text-red-500 text-xs mt-1">{errors.wpName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-1">Yıl <span className="text-brand-primary">*</span></label>
                  <input 
                    type="number" 
                    {...register("wpYear", { required: reportType === "WORK_PROGRAM" ? "Yıl zorunludur" : false, valueAsNumber: true })} 
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary outline-none transition-all font-medium text-brand-dark" 
                  />
                  {errors.wpYear && <p className="text-red-500 text-xs mt-1">{errors.wpYear.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-brand-dark mb-1">Açıklama (Opsiyonel)</label>
                  <textarea 
                    rows={4} 
                    {...register("wpDescription")} 
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-dark/20 focus:border-brand-primary outline-none transition-all font-medium text-brand-dark" 
                  />
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {!isReadOnly && (
          <div className="flex justify-end gap-3 pt-6 border-t border-brand-dark/10">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 rounded-xl font-bold text-brand-dark hover:bg-brand-dark/5 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-colors disabled:opacity-70 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Değişiklikleri Kaydet
            </button>
          </div>
        )}
      </form>

      {/* Image Cropper Modal */}
      <ImageCropperModal 
        isOpen={cropModalOpen}
        imageSrc={currentImageToCrop}
        onClose={() => {
          setCropModalOpen(false)
          setCurrentImageToCrop(null)
          setCropTarget(null)
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
