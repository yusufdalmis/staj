"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { User as UserIcon, Settings, Lock, Mail, Loader2, Save, FileText, Image as ImageIcon } from "lucide-react"
import { useDialog } from "@/components/DialogProvider"
import Link from "next/link"

export default function AyarlarPage() {
  const { data: session, update } = useSession()
  const dialog = useDialog()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({ ...prev, email: session.user.email! }))
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        const data = await res.json()
        dialog.alert("Profil ayarlarınız başarıyla güncellendi.")
        setFormData(prev => ({ ...prev, password: "" }))
        // Refresh session
        await update({ email: data.email })
      } else {
        const errorText = await res.text()
        dialog.alert(`Güncelleme başarısız: ${errorText}`)
      }
    } catch (error) {
      console.error("Failed to update profile", error)
      dialog.alert("Bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in pt-16 md:pt-4 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Profil ve Sistem Ayarları</h1>
          <p className="text-brand-dark/70 text-sm mt-1">Kendi hesabınız ve sistem genelindeki rapor şablonu ile liste ayarlarını buradan yönetebilirsiniz.</p>
        </div>
        {(session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN") && (
          <div className="flex flex-wrap gap-2">
            <Link 
              href="/dashboard/admin/ayarlar/listeler?tab=DOC_TEMPLATE"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md shadow-purple-600/20 hover:shadow-lg transition-all"
            >
              <ImageIcon size={18} /> Rapor Üst/Alt Bilgi & Logo
            </Link>
            <Link 
              href="/dashboard/admin/ayarlar/listeler"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-brand-dark/10 text-brand-dark font-bold hover:bg-brand-light/20 transition-colors shadow-sm"
            >
              <Settings size={18} /> Sistem Listeleri
            </Link>
          </div>
        )}
      </div>

      {/* SUPER ADMIN & ADMIN QUICK CARDS */}
      {(session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/dashboard/admin/ayarlar/listeler?tab=DOC_TEMPLATE" className="group block">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-500/50 relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4 shrink-0 font-bold">
                <ImageIcon size={24} />
              </div>
              <h3 className="text-lg font-bold text-brand-dark mb-1 group-hover:text-purple-600 transition-colors">
                Rapor Üst/Alt Bilgi ve Logo Yönetimi
              </h3>
              <p className="text-brand-dark/60 text-sm flex-grow mb-4">
                Haftalık, Yıllık ve Çalışma Programı Word raporlarındaki Bakanlık/Kurum başlıklarını, dipnot metnini ve kurumsal amblem/logoyu güncelleyin.
              </p>
              <div className="text-purple-600 font-bold text-sm flex items-center gap-1">
                Şablon Ayarlarına Git &rarr;
              </div>
            </div>
          </Link>

          <Link href="/dashboard/admin/ayarlar/listeler" className="group block">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-brand-primary/50 relative overflow-hidden h-full flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4 shrink-0 font-bold">
                <Settings size={24} />
              </div>
              <h3 className="text-lg font-bold text-brand-dark mb-1 group-hover:text-brand-primary transition-colors">
                Sistem Listeleri Yönetimi
              </h3>
              <p className="text-brand-dark/60 text-sm flex-grow mb-4">
                Birimler, SOP'ler, Destek Türleri, Temas Edilen Kurum/Paydaşlar ve Bütçe Kodları gibi açılır listeleri yönetin.
              </p>
              <div className="text-brand-primary font-bold text-sm flex items-center gap-1">
                Listeleri Yönet &rarr;
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* PROFILE SETTINGS CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/5 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-brand-dark/5">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <UserIcon size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-dark">{session?.user?.name || "Kullanıcı"}</h2>
              <p className="text-brand-dark/60">{session?.user?.role === "SUPER_ADMIN" ? "Süper Yönetici (Super Admin)" : session?.user?.role === "ADMIN" ? "Birim Yöneticisi (Admin)" : "Standart Kullanıcı"}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-brand-dark mb-2">
                  <Mail size={16} className="text-brand-primary" /> 
                  E-posta Adresi
                </label>
                <input 
                  type="email" 
                  required
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full rounded-xl border-brand-dark/20 bg-brand-light/20 p-3.5 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-brand-dark font-medium"
                  placeholder="E-posta adresiniz"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-brand-dark mb-2">
                  <Lock size={16} className="text-brand-primary" /> 
                  Yeni Şifre
                </label>
                <input 
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full rounded-xl border-brand-dark/20 bg-brand-light/20 p-3.5 outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all text-brand-dark font-medium"
                  placeholder="Şifrenizi değiştirmek istemiyorsanız boş bırakın"
                />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
