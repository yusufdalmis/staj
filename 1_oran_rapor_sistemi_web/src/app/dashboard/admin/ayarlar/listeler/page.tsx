"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Save, Plus, Trash2, CheckCircle, AlertCircle, Settings, FileText, Image as ImageIcon, Upload, X, Loader2, FileSpreadsheet, Copy } from "lucide-react"
import { ConfirmModal } from "@/components/ConfirmModal"

const SETTING_KEYS = [
  { key: "DOC_TEMPLATE", label: "🎨 Rapor Üst/Alt Bilgileri & Logo" },
  { key: "UNITS", label: "Birimler" },
  { key: "SUB_UNITS", label: "Alt Ofisler (YDO)" },
  { key: "SOPS", label: "Yıllık Ara Rapor SOP'leri" },
  { key: "PROGRAM_TYPES", label: "Bileşen Kodları" },
  { key: "COMPONENTS", label: "Kapsam Takibi (Bileşen Kategorileri)" },
  { key: "COMPONENT_STATUSES", label: "Bileşen Gerçekleşme Durumları" },
  { key: "PROVINCES", label: "İller" },
  { key: "CONTACTED_INSTITUTIONS", label: "Temas Edilen Kurum/Paydaşlar" },
  { key: "BUDGET_CODES", label: "Bütçe Kodları" }
]

const sortListAlphanumeric = (list: string[]) => {
  if (!Array.isArray(list)) return list
  return [...list].sort((a, b) => a.localeCompare(b, "tr", { numeric: true, sensitivity: "base" }))
}

function ListelerAyarlarContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const [settings, setSettings] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("DOC_TEMPLATE")
  const [newValue, setNewValue] = useState("")
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [initialSettings, setInitialSettings] = useState<Record<string, string[]>>({})

  const [confirmState, setConfirmState] = useState<{isOpen: boolean, actionType?: 'TAB' | 'NAV', payload?: string}>({ isOpen: false })
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null)

  useEffect(() => {
    if (tabParam && SETTING_KEYS.some(s => s.key === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setInitialSettings(JSON.parse(JSON.stringify(data)))
      }
    } catch (error) {
      console.error("Failed to fetch settings", error)
    } finally {
      setLoading(false)
    }
  }

  const isDirty = JSON.stringify(settings[activeTab] || []) !== JSON.stringify(initialSettings[activeTab] || [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isDirty) return;
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (link && link.href && !link.href.includes(window.location.pathname) && link.target !== "_blank") {
        e.preventDefault();
        e.stopPropagation();
        setConfirmState({ isOpen: true, actionType: 'NAV', payload: link.href })
      }
    }
    document.addEventListener("click", handleClick, { capture: true })
    return () => document.removeEventListener("click", handleClick, { capture: true })
  }, [isDirty])

  const handleAdd = () => {
    if (!newValue.trim()) return
    const lines = newValue
      .split(/[\r\n]+|\t+/)
      .map(s => s.trim())
      .filter(Boolean)

    if (lines.length === 0) return

    setSettings(prev => {
      const currentList = prev[activeTab] || []
      const newItems = lines.filter(item => !currentList.includes(item))
      if (newItems.length === 0) return prev
      const newList = sortListAlphanumeric([...currentList, ...newItems])
      return { ...prev, [activeTab]: newList }
    })
    setNewValue("")
  }

  const handleBulkAdd = () => {
    const lines = bulkText
      .split(/[\r\n]+|\t+/)
      .map(s => s.trim())
      .filter(Boolean)

    if (lines.length === 0) return

    const uniqueLines = Array.from(new Set(lines))

    setSettings(prev => {
      const currentList = prev[activeTab] || []
      const newItems = uniqueLines.filter(item => !currentList.includes(item))
      if (newItems.length === 0) return prev
      const newList = sortListAlphanumeric([...currentList, ...newItems])
      return { ...prev, [activeTab]: newList }
    })

    setToast({ message: `${uniqueLines.length} adet eleman işlendi ve listeye eklendi!`, type: "success" })
    setTimeout(() => setToast(null), 3000)
    setBulkText("")
    setBulkModalOpen(false)
  }

  const handleRemove = (index: number) => {
    setSettings(prev => {
      const currentList = [...(prev[activeTab] || [])]
      currentList.splice(index, 1)
      return { ...prev, [activeTab]: currentList }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setToast(null)
    try {
      if (activeTab === "DOC_TEMPLATE") {
        // Save doc template keys
        const keysToSave = ["DOC_HEADER_TITLE_1", "DOC_HEADER_TITLE_2", "DOC_FOOTER_TEXT", "DOC_LOGO_BASE64"]
        for (const k of keysToSave) {
          await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: k, values: settings[k] || [""] })
          })
        }
        setInitialSettings(prev => {
          const next = { ...prev }
          for (const k of keysToSave) next[k] = settings[k] || [""]
          return next
        })
      } else {
        const sortedList = sortListAlphanumeric(settings[activeTab] || [])
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: activeTab, values: sortedList })
        })

        if (res.ok) {
          setSettings(prev => ({ ...prev, [activeTab]: sortedList }))
          setInitialSettings(prev => ({ ...prev, [activeTab]: sortedList }))
        }
      }
      setToast({ message: "Ayarlar başarıyla kaydedildi.", type: "success" })
    } catch (error) {
      setToast({ message: "Bir hata oluştu.", type: "error" })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    if (isDirty) {
      setConfirmState({ isOpen: true, actionType: 'TAB', payload: newTab })
      return;
    }
    setActiveTab(newTab)
  }

  const handleConfirmAction = () => {
    if (confirmState.actionType === 'TAB' && confirmState.payload) {
      setSettings(prev => ({
        ...prev,
        [activeTab]: initialSettings[activeTab] || []
      }))
      setActiveTab(confirmState.payload)
    } else if (confirmState.actionType === 'NAV' && confirmState.payload) {
      router.push(confirmState.payload)
    }
    setConfirmState({ isOpen: false })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Str = event.target?.result as string
        setSettings(prev => ({ ...prev, DOC_LOGO_BASE64: [base64Str] }))
      }
      reader.readAsDataURL(file)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-brand-dark opacity-50 font-bold">Yükleniyor...</div>
  }

  if (session?.user?.role !== "SUPER_ADMIN" && session?.user?.role !== "ADMIN") return <div>Yetkiniz yok.</div>

  const currentItems = settings[activeTab] || []

  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4">
      {/* HEADER WITH TOP SAVE BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-dark/5">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
            <Settings className="text-brand-primary" /> Sistem Listeleri ve Şablon Ayarları
          </h1>
          <p className="text-brand-dark/70 text-sm mt-1">Açılır listeleri ve dışa aktarılan Word raporlarının üst/alt bilgi ile logosunu buradan yönetebilirsiniz.</p>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <span className={`flex items-center gap-1.5 font-bold text-sm ${toast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {toast.message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            <Save size={18} />
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
        <div className="flex border-b border-brand-dark/10 overflow-x-auto custom-scrollbar">
          {SETTING_KEYS.map((s) => (
            <button
              key={s.key}
              onClick={() => handleTabChange(s.key)}
              className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors ${
                activeTab === s.key 
                  ? "border-b-2 border-brand-primary text-brand-primary bg-brand-light/20" 
                  : "text-brand-dark/60 hover:bg-brand-light/10 hover:text-brand-dark"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8">
          {activeTab === "DOC_TEMPLATE" ? (
            /* TAB: DOC TEMPLATE SETTINGS */
            <div className="max-w-2xl space-y-6">
              <div className="bg-brand-light/20 border border-brand-primary/20 rounded-xl p-4 text-sm text-brand-dark/80 font-medium">
                <FileText className="inline mr-2 text-brand-primary" />
                Buradaki ayarlar Haftalık, Yıllık ve Çalışma Programı Word belgelerinin kapağında, üst başlıklarında, dipnotlarında ve amblem/logosunda kullanılır.
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-dark mb-1">Bakanlık / Üst Başlık (Satır 1)</label>
                <input
                  type="text"
                  value={settings.DOC_HEADER_TITLE_1?.[0] || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, DOC_HEADER_TITLE_1: [e.target.value] }))}
                  placeholder="Örn: T.C. SANAYİ VE TEKNOLOJİ BAKANLIĞI"
                  className="w-full p-3 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-dark mb-1">Kurum / Alt Başlık (Satır 2)</label>
                <input
                  type="text"
                  value={settings.DOC_HEADER_TITLE_2?.[0] || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, DOC_HEADER_TITLE_2: [e.target.value] }))}
                  placeholder="Örn: ORAN KALKINMA AJANSI"
                  className="w-full p-3 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-dark mb-1">Rapor Dipnot Metni (Footer)</label>
                <input
                  type="text"
                  value={settings.DOC_FOOTER_TEXT?.[0] || ""}
                  onChange={(e) => setSettings(prev => ({ ...prev, DOC_FOOTER_TEXT: [e.target.value] }))}
                  placeholder="Örn: ORAN Kalkınma Ajansı - Faaliyet Raporu"
                  className="w-full p-3 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-dark mb-2">Rapor Amblemi / Logosu</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-brand-dark/20 rounded-xl bg-brand-light/10">
                  {settings.DOC_LOGO_BASE64?.[0] ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={settings.DOC_LOGO_BASE64[0]} 
                        alt="Kurumsal Logo" 
                        className="h-16 max-w-[200px] object-contain bg-white p-2 rounded-lg border border-brand-dark/10 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, DOC_LOGO_BASE64: [""] }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        title="Logoyu Kaldır"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-32 border-2 border-dashed border-brand-dark/20 rounded-lg flex items-center justify-center text-brand-dark/40 bg-white shrink-0">
                      <ImageIcon size={24} />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-xs shadow-md hover:bg-brand-secondary cursor-pointer transition-colors inline-flex items-center gap-2 w-fit">
                      <Upload size={14} />
                      {settings.DOC_LOGO_BASE64?.[0] ? "Logoyu Değiştir" : "Yeni Logo Yükle"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    <p className="text-xs text-brand-dark/60">Önerilen format: PNG/JPG (Yüksek çözünürlük, şeffaf veya beyaz arka plan)</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB: LIST SETTINGS */
            <div className="max-w-3xl space-y-6">
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    placeholder="Yeni eleman yazın (veya metin yapıştırın)..."
                    className="flex-1 p-3 bg-brand-light/30 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newValue.trim()}
                    className="px-5 py-3 bg-brand-dark text-white rounded-xl font-bold hover:bg-brand-secondary transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                  >
                    <Plus size={18} /> Ekle
                  </button>
                </div>
                <button
                  onClick={() => setBulkModalOpen(true)}
                  className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-md shadow-emerald-600/20"
                >
                  <FileSpreadsheet size={18} /> Excel'den Toplu Ekle
                </button>
              </div>

              <div className="bg-brand-light/10 border border-brand-dark/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-brand-light/40 border-b border-brand-dark/10 flex justify-between items-center text-xs font-bold text-brand-dark/70">
                  <span>Mevcut Elemanlar ({currentItems.length})</span>
                  {currentItems.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm("Bu listedeki TÜM elemanları silmek istediğinizden emin misiniz?")) {
                          setSettings(prev => ({ ...prev, [activeTab]: [] }))
                        }
                      }}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
                    >
                      <Trash2 size={14} /> Tümünü Sil
                    </button>
                  )}
                </div>

                {currentItems.length === 0 ? (
                  <div className="p-8 text-center text-brand-dark/50 font-medium text-sm space-y-2">
                    <p>Bu listede henüz eleman bulunmuyor.</p>
                    <p className="text-xs text-brand-dark/40">Yukarıdaki alandan tek tek ekleyebilir veya Excel'den toplu yapıştırabilirsiniz.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-brand-dark/5 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {currentItems.map((item, index) => (
                      <li key={index} className="flex items-center justify-between p-4 hover:bg-brand-light/30 transition-colors">
                        <span className="font-bold text-black text-sm">{item}</span>
                        <button
                          onClick={() => handleRemove(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-brand-dark/10">
                <div className="text-sm">
                  {toast && (
                    <span className={`flex items-center gap-1.5 font-bold ${toast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {toast.message}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* BULK ADD MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-brand-dark/10 max-w-2xl w-full p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-brand-dark/10 pb-4">
              <div>
                <h3 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-600" /> Excel'den / Listeden Toplu Ekle
                </h3>
                <p className="text-xs text-brand-dark/60 mt-1">
                  Excel'den kopyaladığınız sütun verilerini veya çok satırlı metni aşağıdaki kutuya yapıştırın. Her satır bir eleman olarak eklenecektir.
                </p>
              </div>
              <button 
                onClick={() => { setBulkModalOpen(false); setBulkText(""); }} 
                className="text-brand-dark/50 hover:text-brand-dark p-1 rounded-lg hover:bg-brand-light/30 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-brand-dark">Kopyalanan Metin / Excel Sütunu</label>
              <textarea
                rows={10}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Örnek:\nDeğer Zinciri Analizi Çalışmaları\nSınai Mülkiyet Hakları Faaliyetleri\nBölge Tanıtımı"}
                className="w-full p-4 bg-brand-light/20 border border-brand-dark/20 rounded-xl text-sm font-medium text-brand-dark outline-none focus:border-brand-primary font-mono resize-y"
              />
              
              {bulkText.trim() && (
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span>📊 Tespit Edilen Benzersiz Eleman Sayısı:</span>
                  <span className="text-sm bg-emerald-600 text-white px-2.5 py-0.5 rounded-md">
                    {Array.from(new Set(bulkText.split(/[\r\n]+|\t+/).map(s => s.trim()).filter(Boolean))).length} adet
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-brand-dark/10">
              <button
                onClick={() => { setBulkModalOpen(false); setBulkText(""); }}
                className="px-5 py-2.5 bg-gray-100 text-brand-dark rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm"
              >
                Vazgeç
              </button>
              <button
                onClick={handleBulkAdd}
                disabled={!bulkText.trim()}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
              >
                <Plus size={16} />
                Listeye Aktar ({Array.from(new Set(bulkText.split(/[\r\n]+|\t+/).map(s => s.trim()).filter(Boolean))).length})
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Kaydedilmemiş Değişiklikler"
        message="Sayfadan ayrılmak istediğinize emin misiniz? Henüz işlemleri kaydetmediniz."
        confirmText="Yine de Ayrıl"
        cancelText="Vazgeç"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ isOpen: false })}
      />
    </div>
  )
}

export default function ListelerAyarlarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-brand-dark opacity-50 font-bold flex items-center justify-center gap-2"><Loader2 className="animate-spin" /> Yükleniyor...</div>}>
      <ListelerAyarlarContent />
    </Suspense>
  )
}
