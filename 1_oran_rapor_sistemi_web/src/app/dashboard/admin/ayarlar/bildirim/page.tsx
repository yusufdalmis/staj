"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Save, Bell, CheckCircle, AlertCircle, Calendar, Mail, Server } from "lucide-react"

export default function BildirimAyarlariPage() {
  const { data: session } = useSession()
  const [type, setType] = useState("WEEKLY") // WEEKLY or CUSTOM
  const [day, setDay] = useState("1")
  const [time, setTime] = useState("15:00")
  const [customDate, setCustomDate] = useState("")

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("465")
  const [smtpSecure, setSmtpSecure] = useState(true)
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPass, setSmtpPass] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")

  // Notification Content Settings
  const [warningEnabled, setWarningEnabled] = useState(true)
  const [warningHours, setWarningHours] = useState("6")
  const [warningSubject, setWarningSubject] = useState("Rapor Hatırlatması")
  const [warningContent, setWarningContent] = useState("Merhaba {{name}},\n\nBu hafta faaliyet raporunuzu henüz sisteme girmediniz. Raporunuzu iletmeniz için {{hours}} saat kaldı. Lütfen en kısa sürede raporunuzu ekleyiniz.\n\nİyi çalışmalar.")
  
  const [missedSubject, setMissedSubject] = useState("Rapor Süresi Doldu")
  const [missedContent, setMissedContent] = useState("Merhaba {{name}},\n\nBu hafta belirlenen {{deadline}} mühleti içerisinde, faaliyet raporunuzu sisteme girmediniz. Lütfen en kısa sürede raporunuzu ekleyiniz.\n\nİyi çalışmalar.")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        if (data.REMINDER_TYPE?.length > 0) setType(data.REMINDER_TYPE[0])
        if (data.REMINDER_DAY?.length > 0) setDay(data.REMINDER_DAY[0])
        if (data.REMINDER_TIME?.length > 0) setTime(data.REMINDER_TIME[0])
        if (data.REMINDER_CUSTOM_DATE?.length > 0) setCustomDate(data.REMINDER_CUSTOM_DATE[0])
        
        if (data.SMTP_HOST?.length > 0) setSmtpHost(data.SMTP_HOST[0])
        if (data.SMTP_PORT?.length > 0) setSmtpPort(data.SMTP_PORT[0])
        if (data.SMTP_SECURE?.length > 0) setSmtpSecure(data.SMTP_SECURE[0] === "true")
        if (data.SMTP_USER?.length > 0) setSmtpUser(data.SMTP_USER[0])
        if (data.SMTP_PASS?.length > 0) setSmtpPass(data.SMTP_PASS[0])
        if (data.SMTP_FROM?.length > 0) setSmtpFrom(data.SMTP_FROM[0])

        if (data.WARNING_ENABLED?.length > 0) setWarningEnabled(data.WARNING_ENABLED[0] === "true")
        if (data.WARNING_HOURS?.length > 0) setWarningHours(data.WARNING_HOURS[0])
        if (data.WARNING_MESSAGE_SUBJECT?.length > 0) setWarningSubject(data.WARNING_MESSAGE_SUBJECT[0])
        if (data.WARNING_MESSAGE_CONTENT?.length > 0) setWarningContent(data.WARNING_MESSAGE_CONTENT[0])
        if (data.MISSED_MESSAGE_SUBJECT?.length > 0) setMissedSubject(data.MISSED_MESSAGE_SUBJECT[0])
        if (data.MISSED_MESSAGE_CONTENT?.length > 0) setMissedContent(data.MISSED_MESSAGE_CONTENT[0])
      }
    } catch (error) {
      console.error("Failed to fetch settings", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setToast(null)
    
    const settingsToSave = [
      { key: "REMINDER_TYPE", values: [type] },
      { key: "REMINDER_DAY", values: [day] },
      { key: "REMINDER_TIME", values: [time] },
      { key: "REMINDER_CUSTOM_DATE", values: [customDate] },
      { key: "SMTP_HOST", values: [smtpHost] },
      { key: "SMTP_PORT", values: [smtpPort] },
      { key: "SMTP_SECURE", values: [smtpSecure ? "true" : "false"] },
      { key: "SMTP_USER", values: [smtpUser] },
      { key: "SMTP_PASS", values: [smtpPass] },
      { key: "SMTP_FROM", values: [smtpFrom] },
      { key: "WARNING_ENABLED", values: [warningEnabled ? "true" : "false"] },
      { key: "WARNING_HOURS", values: [warningHours] },
      { key: "WARNING_MESSAGE_SUBJECT", values: [warningSubject] },
      { key: "WARNING_MESSAGE_CONTENT", values: [warningContent] },
      { key: "MISSED_MESSAGE_SUBJECT", values: [missedSubject] },
      { key: "MISSED_MESSAGE_CONTENT", values: [missedContent] },
    ]

    try {
      const promises = settingsToSave.map(s => 
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s)
        })
      )
      
      const results = await Promise.all(promises)
      if (results.every(r => r.ok)) {
        setToast({ message: "Tüm ayarlar başarıyla kaydedildi.", type: "success" })
      } else {
        setToast({ message: "Bazı ayarlar kaydedilemedi.", type: "error" })
      }
    } catch (error) {
      setToast({ message: "Bir hata oluştu.", type: "error" })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-brand-dark opacity-50 font-bold">Yükleniyor...</div>
  }

  if (session?.user?.role !== "SUPER_ADMIN") return <div>Yetkiniz yok.</div>

  return (
    <div className="space-y-6 animate-in fade-in pt-16 md:pt-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
          <Bell className="text-brand-primary" /> Bildirim Ayarları
        </h1>
        <p className="text-brand-dark/70 text-sm mt-1">Eksik raporlar için uyarı zamanlamasını ve e-posta (SMTP) ayarlarını yapılandırın.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* ZAMANLAMA AYARLARI */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-primary/20 max-w-3xl">
          <h2 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-brand-primary" /> Zamanlama Ayarları
          </h2>
          
          <div className="flex gap-4 mb-6">
            <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${type === 'WEEKLY' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-dark/10 hover:border-brand-dark/30'}`}>
              <input type="radio" name="type" value="WEEKLY" checked={type === "WEEKLY"} onChange={() => setType("WEEKLY")} className="sr-only" />
              <div className="font-bold text-brand-dark mb-1">Haftalık Döngü</div>
              <div className="text-xs text-brand-dark/60">Her hafta aynı gün ve saatte kontrol eder. (6 saat önce ilk, bitimde ikinci uyarır)</div>
            </label>
            <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${type === 'CUSTOM' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-dark/10 hover:border-brand-dark/30'}`}>
              <input type="radio" name="type" value="CUSTOM" checked={type === "CUSTOM"} onChange={() => setType("CUSTOM")} className="sr-only" />
              <div className="font-bold text-brand-dark mb-1">Belirli Tarih</div>
              <div className="text-xs text-brand-dark/60">Tek seferlik, seçeceğiniz tam tarihte kontrol eder. (6 saat önce ilk, bitimde ikinci uyarır)</div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {type === "WEEKLY" ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-2">Kontrol Günü</label>
                  <select value={day} onChange={e => setDay(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark">
                    <option value="1">Pazartesi</option>
                    <option value="2">Salı</option>
                    <option value="3">Çarşamba</option>
                    <option value="4">Perşembe</option>
                    <option value="5">Cuma</option>
                    <option value="6">Cumartesi</option>
                    <option value="0">Pazar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-2">Kontrol Saati</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark" />
                </div>
              </>
            ) : (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-brand-dark mb-2">Belirli Tarih ve Saat</label>
                <input type="datetime-local" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark" />
              </div>
            )}
          </div>
        </div>

        {/* BİLDİRİM İÇERİĞİ AYARLARI */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-primary/20 max-w-3xl">
          <h2 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
            <Mail size={20} className="text-brand-primary" /> Bildirim Mesajı Ayarları
          </h2>
          <p className="text-sm text-brand-dark/70 mb-6">
            Bildirim e-postalarının içeriklerini ve uyarı sürelerini belirleyin. Kullanabileceğiniz değişkenler: <code className="bg-brand-dark/5 px-1 rounded">{'{{name}}'}</code>, <code className="bg-brand-dark/5 px-1 rounded">{'{{hours}}'}</code>, <code className="bg-brand-dark/5 px-1 rounded">{'{{deadline}}'}</code>.
          </p>

          <div className="space-y-6">
            <div className="bg-brand-light/20 p-4 rounded-xl border border-brand-dark/10">
              <label className="flex items-center gap-2 cursor-pointer mb-4">
                <input 
                  type="checkbox" 
                  checked={warningEnabled} 
                  onChange={e => setWarningEnabled(e.target.checked)} 
                  className="w-4 h-4 text-brand-primary"
                />
                <span className="font-bold text-brand-dark">Önceden bildirim gönderilsin mi?</span>
              </label>

              {warningEnabled && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-brand-dark mb-2">Kaç Saat Önceden Uyarılsın?</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={warningHours} onChange={e => setWarningHours(e.target.value)} className="w-24 rounded-xl border border-brand-dark/20 bg-white p-2.5 outline-none focus:border-brand-primary text-brand-dark text-center" />
                      <span className="text-sm font-medium text-brand-dark/70">Saat (Örn: 6)</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-brand-dark mb-3 border-b border-brand-dark/10 pb-2">Ön Uyarı Mesajı</h3>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">E-posta Konusu</label>
                    <input type="text" value={warningSubject} onChange={e => setWarningSubject(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-white p-2.5 outline-none focus:border-brand-primary text-brand-dark" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">Mesaj İçeriği</label>
                    <textarea value={warningContent} onChange={e => setWarningContent(e.target.value)} rows={4} className="w-full rounded-xl border border-brand-dark/20 bg-white p-2.5 outline-none focus:border-brand-primary text-brand-dark resize-none"></textarea>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <h3 className="font-bold text-red-800 mb-3 border-b border-red-200 pb-2">Süre Aşımı (Gecikme) Mesajı</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-red-800 mb-1">E-posta Konusu</label>
                  <input type="text" value={missedSubject} onChange={e => setMissedSubject(e.target.value)} className="w-full rounded-xl border border-red-200 bg-white p-2.5 outline-none focus:border-red-400 text-brand-dark" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-800 mb-1">Mesaj İçeriği</label>
                  <textarea value={missedContent} onChange={e => setMissedContent(e.target.value)} rows={4} className="w-full rounded-xl border border-red-200 bg-white p-2.5 outline-none focus:border-red-400 text-brand-dark resize-none"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* E-POSTA SUNUCU (SMTP) AYARLARI */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-primary/20 max-w-3xl">
          <h2 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
            <Server size={20} className="text-brand-primary" /> E-posta Sunucu (SMTP) Ayarları
          </h2>
          <p className="text-sm text-brand-dark/70 mb-6">
            Bildirimlerin gönderilebilmesi için e-posta sunucunuzu yapılandırın. Gmail için <code className="bg-brand-dark/5 px-1 rounded">smtp.gmail.com</code> ve <code className="bg-brand-dark/5 px-1 rounded">465</code> portunu kullanabilir, şifre alanına <strong>Google Uygulama Şifresi</strong> girebilirsiniz.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-brand-dark mb-2">Gönderen E-posta (From)</label>
              <input type="email" placeholder="no-reply@oran.org.tr" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark" />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-dark mb-2">SMTP Host</label>
              <input type="text" data-no-capitalize="true" placeholder="smtp.gmail.com" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark" />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-brand-dark mb-2">Port</label>
                <input type="number" placeholder="465" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark" />
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 h-[50px] cursor-pointer">
                  <input type="checkbox" checked={smtpSecure} onChange={e => setSmtpSecure(e.target.checked)} className="w-5 h-5 rounded border-brand-dark/20 text-brand-primary" />
                  <span className="text-sm font-bold text-brand-dark">SSL/TLS (Secure)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-dark mb-2">Kullanıcı Adı</label>
              <input type="text" data-no-capitalize="true" placeholder="Kullanıcı e-posta adresiniz" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark" />
            </div>

            <div>
              <label className="block text-sm font-bold text-brand-dark mb-2">Şifre / App Password</label>
              <input type="password" placeholder="Şifreniz" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} className="w-full rounded-xl border border-brand-dark/20 bg-brand-light/20 p-3 outline-none focus:border-brand-primary transition-all text-brand-dark" />
            </div>
          </div>
        </div>

        <div className="max-w-3xl flex items-center justify-between">
          <div className="text-sm">
            {toast && (
              <span className={`flex items-center gap-1.5 font-bold ${toast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {toast.message}
              </span>
            )}
          </div>
          <button 
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </button>
        </div>
      </form>
    </div>
  )
}
