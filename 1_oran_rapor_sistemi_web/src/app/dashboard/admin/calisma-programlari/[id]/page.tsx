"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Plus, Trash2, Download, X } from "lucide-react"
import { exportWorkProgramAsDesigned } from "@/lib/exportWordWorkProgram"
import { useDialog } from "@/components/DialogProvider"

export default function EditWorkProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const dialog = useDialog()
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const isNew = id === "yeni"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [year, setYear] = useState("")
  const [unit, setUnit] = useState("")
  const [description, setDescription] = useState("")
  const [activities, setActivities] = useState<any[]>([])

  // Store full program data for exporting
  const [fullProgram, setFullProgram] = useState<any>(null)
  
  // Store settings lists
  const [lists, setLists] = useState<Record<string, string[]>>({})

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const settingsRes = await fetch("/api/settings")
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setLists(settingsData)
      }

      if (!isNew) {
        const res = await fetch(`/api/admin/work-programs/${id}`)
        if (res.ok) {
          const data = await res.json()
          setFullProgram(data)
          setName(data.name || "")
          setYear(data.year ? data.year.toString() : "")
          setUnit(data.unit || "")
          setDescription(data.description || "")
          setActivities(data.activities || [])
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (fullProgram) {
      exportWorkProgramAsDesigned([fullProgram])
    } else {
      dialog.alert("Program verisi yüklenemedi.")
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !year.trim() || !unit.trim()) {
      dialog.alert("Lütfen program adı, yılı ve ilgili birimi giriniz.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        year,
        unit: unit.trim(),
        description: description.trim(),
        activities
      }

      if (isNew) {
        const res = await fetch("/api/admin/work-programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, year, unit })
        })
        const data = await res.json()
        
        
        await fetch(`/api/admin/work-programs/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        
        router.push(`/dashboard/calismalarim/${data.id}`)
      } else {
        await fetch(`/api/admin/work-programs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
        router.push(`/dashboard/calismalarim/${id}`)
      }
    } catch (error) {
      console.error("Error saving:", error)
      dialog.alert("Kaydedilirken bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  const addActivity = () => {
    setActivities([...activities, { 
      id: "", name: "", relatedGoal: "", responsibleUnit: "", supportUnit: "", stakeholders: [], budgetCode: "", 
      budgets: [{ name: "", code: "", amount: "" }], plannedMonths: [],
      performanceIndicator: "", resultIndicator: "", measurementUnit: "", target: "", verificationSource: ""
    }])
  }

  const updateActivity = (index: number, field: string, value: any) => {
    const newArr = [...activities]
    newArr[index] = { ...newArr[index], [field]: value }
    setActivities(newArr)
  }

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index))
  }

  const addBudget = (actIndex: number) => {
    const act = activities[actIndex];
    const newBudgets = [...(act.budgets || []), { name: "", code: "", amount: "" }];
    updateActivity(actIndex, "budgets", newBudgets);
  }

  const updateBudget = (actIndex: number, budgetIndex: number, field: string, value: string) => {
    const act = activities[actIndex];
    const newBudgets = [...(act.budgets || [])];
    if (!newBudgets[budgetIndex]) newBudgets[budgetIndex] = { name: "", code: "", amount: "" };
    newBudgets[budgetIndex] = { ...newBudgets[budgetIndex], [field]: value };
    updateActivity(actIndex, "budgets", newBudgets);
  }

  const removeBudget = (actIndex: number, budgetIndex: number) => {
    const act = activities[actIndex];
    const newBudgets = [...(act.budgets || [])];
    newBudgets.splice(budgetIndex, 1);
    updateActivity(actIndex, "budgets", newBudgets);
  }

  const toggleMonth = (index: number, month: number) => {
    const currentMonths = activities[index].plannedMonths || []
    const newMonths = currentMonths.includes(month) 
      ? currentMonths.filter((m: number) => m !== month)
      : [...currentMonths, month].sort((a,b) => a-b)
    updateActivity(index, "plannedMonths", newMonths)
  }

  const allUnits = [...(lists.UNITS || []), ...(lists.SUB_UNITS || [])]
  const allBudgetCodes = lists.BUDGET_CODES || []

  if (loading) return <div className="p-12 text-center">Yükleniyor...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/60 p-6 rounded-2xl backdrop-blur-xl border border-white/50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/calismalarim" className="p-2 bg-white rounded-lg shadow-sm hover:bg-brand-light text-brand-dark/70 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">{isNew ? "Yeni Çalışma Programı" : "Programı Düzenle"}</h1>
            <p className="text-brand-dark/60 mt-1">Yıllık planı ve faaliyetleri detaylandırın.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <button onClick={handleExport} className="flex items-center gap-2 bg-white text-brand-dark px-4 py-2.5 rounded-xl font-medium border border-brand-dark/10 hover:bg-brand-light transition-all shadow-sm">
              <Download size={20} />
              Word İndir
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-primary/90 transition-all shadow-md shadow-brand-primary/20 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="bg-white/80 p-6 rounded-2xl border border-brand-dark/5 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-dark mb-4">Genel Bilgiler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-dark/70 mb-1">Program Adı</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full text-black bg-white border border-brand-dark/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50" placeholder="Örn: 2025 Yılı Programı" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-dark/70 mb-1">Yıl</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full text-black bg-white border border-brand-dark/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-dark/70 mb-1">Birim</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full text-black bg-white border border-brand-dark/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50">
              <option value="">Seçiniz...</option>
              {allUnits.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 border-t border-brand-dark/10 pt-4">
          <label className="block text-sm font-medium text-brand-dark/70 mb-1">Faaliyet Açıklaması (Genel)</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full text-black bg-white border border-brand-dark/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 resize-y min-h-[100px]" 
            placeholder="Bu çalışma programındaki faaliyetlerin genel özetini veya açıklamasını buraya girebilirsiniz..."
          />
        </div>
      </div>

      <div className="bg-white/80 p-6 rounded-2xl border border-brand-dark/5 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-brand-dark">Ana Faaliyetler</h2>
          <button onClick={addActivity} className="flex items-center gap-1 text-sm text-brand-primary font-medium hover:bg-brand-light px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={16} /> Faaliyet Ekle
          </button>
        </div>
        
        <div className="space-y-8">
          {activities.map((act, idx) => (
            <div key={idx} className="relative p-6 bg-brand-light/20 border border-brand-dark/10 rounded-2xl shadow-sm">
              <button onClick={() => removeActivity(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors">
                <Trash2 size={20} />
              </button>
              
              <div className="grid grid-cols-1 gap-8">
                {/* Sol Taraf: Genel & Zamanlama */}
                <div className="space-y-4">
                  <h3 className="font-bold text-brand-dark border-b border-brand-dark/10 pb-2">Program Süresi ve Zaman Planlaması</h3>
                  
                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">Faaliyet Adı</label>
                    <textarea value={act.name} onChange={e => updateActivity(idx, "name", e.target.value)} className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2 resize-none h-16" placeholder="Faaliyet adını giriniz..." />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-brand-dark mb-1">İlgili Özel Amaç</label>
                    <input type="text" value={act.relatedGoal || ""} onChange={e => updateActivity(idx, "relatedGoal", e.target.value)} className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2" />
                  </div>
                  
                  <div className="border border-brand-dark/10 rounded-xl p-4 bg-white/50 space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-brand-dark">Bütçe Bilgileri</label>
                      <button type="button" onClick={() => addBudget(idx)} className="text-xs flex items-center gap-1 text-brand-primary font-bold hover:bg-brand-primary/10 px-2 py-1 rounded">
                        <Plus size={14} /> Yeni Bütçe Ekle
                      </button>
                    </div>
                    
                    {(act.budgets || []).map((budget: any, bIdx: number) => (
                      <div key={bIdx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end relative border-b border-brand-dark/5 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase font-bold text-brand-dark/60 mb-1">Bütçe Seçimi (Kodu ve Adı)</label>
                          <select 
                            value={budget.code ? `${budget.code} - ${budget.name}` : ""}
                            onChange={e => {
                               const val = e.target.value;
                               const newBudgets = [...(act.budgets || [])];
                               if(!val) {
                                 newBudgets[bIdx] = { ...newBudgets[bIdx], code: "", name: "" };
                               } else {
                                 const parts = val.split(" - ");
                                 newBudgets[bIdx] = { ...newBudgets[bIdx], code: parts[0] || "", name: parts.slice(1).join(" - ") || "" };
                               }
                               updateActivity(idx, "budgets", newBudgets);
                            }}
                            className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2"
                          >
                            <option value="">Seçiniz...</option>
                            {allBudgetCodes.map((bc, i) => <option key={i} value={bc}>{bc}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] uppercase font-bold text-brand-dark/60 mb-1">Bütçe Tutarı</label>
                            <input 
                              type="text" 
                              value={budget.amount ? budget.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""} 
                              onChange={e => {
                                const rawValue = e.target.value.replace(/\./g, "");
                                if (/^[\d,]*$/.test(rawValue)) {
                                  updateBudget(idx, bIdx, "amount", rawValue);
                                }
                              }} 
                              className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2" 
                            />
                          </div>
                          <button type="button" onClick={() => removeBudget(idx, bIdx)} className="text-red-400 hover:text-red-600 p-2 mb-0.5 self-end">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!act.budgets || act.budgets.length === 0) && (
                      <div className="text-xs text-brand-dark/50 italic text-center py-2">Bütçe bilgisi eklenmemiş.</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-dark mb-1">Sorumlu Birim(ler)</label>
                      <div className="p-2 bg-white border border-brand-dark/20 rounded-xl focus-within:border-brand-primary transition-colors min-h-[42px]">
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {(act.responsibleUnit ? act.responsibleUnit.split(', ') : []).map((u: string) => (
                             <div key={u} className="flex items-center gap-1 bg-brand-primary/10 text-brand-primary px-2 py-1 rounded text-xs font-bold border border-brand-primary/20">
                               {u}
                               <button type="button" className="hover:text-red-500" onClick={() => {
                                 const arr = (act.responsibleUnit ? act.responsibleUnit.split(', ') : []).filter((x: string) => x !== u);
                                 updateActivity(idx, "responsibleUnit", arr.join(", "));
                               }}>
                                 <X size={12} />
                               </button>
                             </div>
                          ))}
                        </div>
                        <select 
                          value=""
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) return;
                            const current = act.responsibleUnit ? act.responsibleUnit.split(', ') : [];
                            if (!current.includes(val)) {
                              updateActivity(idx, "responsibleUnit", [...current, val].join(", "));
                            }
                          }}
                          className="w-full bg-transparent text-xs font-medium text-brand-dark outline-none py-1"
                        >
                          <option value="">+ Birim Ekle...</option>
                          {allUnits.filter(u => !(act.responsibleUnit ? act.responsibleUnit.split(', ') : []).includes(u)).map((u, i) => <option key={i} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-dark mb-1">Destek Birimi/Birimleri</label>
                      <div className="p-2 bg-white border border-brand-dark/20 rounded-xl focus-within:border-brand-primary transition-colors min-h-[42px]">
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {(act.supportUnit ? act.supportUnit.split(', ') : []).map((u: string) => (
                             <div key={u} className="flex items-center gap-1 bg-brand-primary/10 text-brand-primary px-2 py-1 rounded text-xs font-bold border border-brand-primary/20">
                               {u}
                               <button type="button" className="hover:text-red-500" onClick={() => {
                                 const arr = (act.supportUnit ? act.supportUnit.split(', ') : []).filter((x: string) => x !== u);
                                 updateActivity(idx, "supportUnit", arr.join(", "));
                               }}>
                                 <X size={12} />
                               </button>
                             </div>
                          ))}
                        </div>
                        <select 
                          value=""
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) return;
                            const current = act.supportUnit ? act.supportUnit.split(', ') : [];
                            if (!current.includes(val)) {
                              updateActivity(idx, "supportUnit", [...current, val].join(", "));
                            }
                          }}
                          className="w-full bg-transparent text-xs font-medium text-brand-dark outline-none py-1"
                        >
                          <option value="">+ Birim Ekle...</option>
                          {allUnits.filter(u => !(act.supportUnit ? act.supportUnit.split(', ') : []).includes(u)).map((u, i) => <option key={i} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">Temas Edilen Kurum/Paydaşlar</label>
                    <div className="p-2 bg-white border border-brand-dark/20 rounded-xl focus-within:border-brand-primary transition-colors min-h-[42px]">
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {(act.stakeholders || []).map((sh: string) => (
                             <div key={sh} className="flex items-center gap-1 bg-brand-primary/10 text-brand-primary px-2 py-1 rounded text-xs font-bold border border-brand-primary/20">
                               {sh}
                               <button type="button" className="hover:text-red-500" onClick={() => {
                                 const arr = (act.stakeholders || []).filter((x: string) => x !== sh);
                                 updateActivity(idx, "stakeholders", arr);
                               }}>
                                 <X size={12} />
                               </button>
                             </div>
                          ))}
                        </div>
                        <select 
                          value=""
                          onChange={e => {
                            const val = e.target.value;
                            if (!val) return;
                            const current = act.stakeholders || [];
                            if (!current.includes(val)) {
                              updateActivity(idx, "stakeholders", [...current, val]);
                            }
                          }}
                          className="w-full bg-transparent text-xs font-medium text-brand-dark outline-none py-1"
                        >
                          <option value="">+ Paydaş Ekle...</option>
                          {(lists.CONTACTED_INSTITUTIONS || []).filter(sh => !(act.stakeholders || []).includes(sh)).map((sh, i) => <option key={i} value={sh}>{sh}</option>)}
                        </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-2">Aylar (Planlanan)</label>
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <label key={m} className="flex items-center gap-1 bg-white border border-brand-dark/10 px-2 py-1 rounded-md cursor-pointer hover:bg-brand-light/50">
                          <input type="checkbox" checked={(act.plannedMonths || []).includes(m)} onChange={() => toggleMonth(idx, m)} className="w-3 h-3 text-brand-primary" />
                          <span className="text-xs font-medium text-brand-dark">{m}. Ay</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf: Sonuç ve Çıktı */}
                <div className="space-y-4">
                  <h3 className="font-bold text-brand-dark border-b border-brand-dark/10 pb-2 flex justify-between items-center">
                    Sonuç ve Çıktı Hedefleri
                    <button 
                      onClick={() => updateActivity(idx, "_showResults", act._showResults === undefined ? !(act.performanceIndicator || act.resultIndicator || act.measurementUnit || act.target || act.verificationSource) : !act._showResults)}
                      className="text-xs text-brand-primary border border-brand-primary rounded px-2 py-1 hover:bg-brand-primary/10 transition-colors"
                      type="button"
                    >
                      {(act._showResults === undefined ? !!(act.performanceIndicator || act.resultIndicator || act.measurementUnit || act.target || act.verificationSource) : act._showResults) ? "İptal / Gizle" : "Hedef Ekle"}
                    </button>
                  </h3>
                  
                  {(act._showResults === undefined ? !!(act.performanceIndicator || act.resultIndicator || act.measurementUnit || act.target || act.verificationSource) : act._showResults) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs font-bold text-brand-dark mb-1">Performans Göstergeleri</label>
                        <textarea value={act.performanceIndicator || ""} onChange={e => updateActivity(idx, "performanceIndicator", e.target.value)} className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2 resize-none h-16" placeholder="Göstergeleri giriniz..." />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-brand-dark mb-1">Sonuç/Çıktı Göstergesi</label>
                          <input type="text" value={act.resultIndicator || ""} onChange={e => updateActivity(idx, "resultIndicator", e.target.value)} className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2" placeholder="Örn: Çıktı" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-dark mb-1">Ölçüm Birimi</label>
                          <input type="text" value={act.measurementUnit || ""} onChange={e => updateActivity(idx, "measurementUnit", e.target.value)} className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2" placeholder="Örn: Adet" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-brand-dark mb-1">Hedef</label>
                          <input type="text" value={act.target || ""} onChange={e => updateActivity(idx, "target", e.target.value)} className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-brand-dark mb-1">Doğrulama Kaynağı</label>
                          <input type="text" value={act.verificationSource || ""} onChange={e => updateActivity(idx, "verificationSource", e.target.value)} className="w-full text-sm text-black bg-white border border-brand-dark/20 focus:border-brand-primary rounded-lg p-2" placeholder="Örn: Faaliyet Raporu" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {activities.length === 0 && (
            <div className="py-12 text-center text-brand-dark/40 font-medium">
              Henüz faaliyet eklenmemiş. "Faaliyet Ekle" butonu ile başlayabilirsiniz.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
