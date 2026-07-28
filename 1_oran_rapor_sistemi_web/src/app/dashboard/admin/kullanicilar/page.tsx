"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { UserPlus, Edit, Trash2, Check, X, Shield, ShieldAlert, Loader2 } from "lucide-react"
import { ConfirmModal } from "@/components/ConfirmModal"

type User = {
  id: string
  email: string
  name: string
  role: string
  unit: string | null
  isActive: boolean
  createdAt: string
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, id?: string}>({ isOpen: false })
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    unit: "",
    isActive: true
  })
  
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string[]>>({})

  useEffect(() => {
    fetchUsers()
    fetchSettings()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        setSettings(await res.json())
      }
    } catch (e) {}
  }

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "", // Do not populate password
        role: user.role,
        unit: user.unit || "",
        isActive: user.isActive
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "USER",
        unit: "",
        isActive: true
      })
    }
    setIsModalOpen(true)
  }

  const handleDeleteClick = (id: string) => {
    setConfirmState({ isOpen: true, id })
  }

  const handleConfirmDelete = async () => {
    if (!confirmState.id) return
    const id = confirmState.id
    setConfirmState({ isOpen: false })

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchUsers()
      } else {
        const errorText = await res.text()
        alert(`Kullanıcı silinirken hata oluştu: ${errorText}`)
      }
    } catch (error) {
      console.error("Failed to delete user", error)
      alert("Bir hata oluştu.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        })
        if (res.ok) {
          alert("Kullanıcı güncellendi.")
          setIsModalOpen(false)
          fetchUsers()
        } else {
          alert("Kullanıcı güncellenirken hata oluştu.")
        }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        })
        if (res.ok) {
          alert("Yeni kullanıcı oluşturuldu.")
          setIsModalOpen(false)
          fetchUsers()
        } else {
          const err = await res.text()
          alert("Hata: " + err)
        }
      }
    } catch (error) {
      console.error(error)
      alert("Bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>
  
  if (session?.user?.role !== "SUPER_ADMIN") return <div>Yetkiniz yok.</div>

  const units = [...(settings.UNITS || []), ...(settings.SUB_UNITS || [])]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Kullanıcı Yönetimi</h1>
          <p className="text-brand-dark/60 text-sm mt-1">Sistemdeki tüm kullanıcıları görüntüleyin, ekleyin veya düzenleyin.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"
        >
          <UserPlus size={18} />
          Yeni Kullanıcı
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-brand-dark/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-light/50 border-b border-brand-dark/10">
                <th className="p-4 font-semibold text-brand-dark">İsim / Email</th>
                <th className="p-4 font-semibold text-brand-dark">Birim</th>
                <th className="p-4 font-semibold text-brand-dark">Yetki</th>
                <th className="p-4 font-semibold text-brand-dark">Durum</th>
                <th className="p-4 font-semibold text-brand-dark">Tarih</th>
                <th className="p-4 font-semibold text-brand-dark text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-brand-dark/10 hover:bg-brand-light/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-brand-dark">{user.name}</div>
                    <div className="text-sm text-brand-dark">{user.email}</div>
                  </td>
                  <td className="p-4 text-brand-dark">{user.unit || "-"}</td>
                  <td className="p-4">
                    {user.role === "SUPER_ADMIN" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                        <ShieldAlert size={12} /> SUPER ADMIN
                      </span>
                    ) : user.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                        <ShieldAlert size={12} /> ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        <Shield size={12} /> USER
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        <Check size={12} /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        <X size={12} /> Pasif
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-brand-dark">
                    {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors"
                        title="Düzenle"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(user.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Sil"
                        disabled={user.email === session?.user?.email}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-brand-dark/70">Sistemde henüz kullanıcı bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-brand-dark/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-brand-dark">{editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-dark/50 hover:text-brand-dark"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1">İsim Soyisim</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-brand-dark placeholder-brand-dark/50" placeholder="Örn: Ahmet Yılmaz" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1">E-Posta Adresi</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-brand-dark placeholder-brand-dark/50" placeholder="Örn: ahmet@oran.org.tr" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1">Şifre {editingUser && <span className="font-normal text-brand-dark/50">(Değiştirmek istemiyorsanız boş bırakın)</span>}</label>
                <input required={!editingUser} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-brand-dark placeholder-brand-dark/50" placeholder="********" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-dark mb-1">Birim</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full p-3 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-brand-dark">
                    <option value="" className="text-brand-dark bg-white">Seçiniz</option>
                    {units.map(u => (
                      <option key={u} value={u} className="text-brand-dark bg-white">{u}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-brand-dark mb-1">Yetki</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 bg-brand-light/50 border border-brand-dark/20 rounded-xl focus:outline-none focus:border-brand-primary transition-colors text-brand-dark">
                    <option value="USER" className="text-brand-dark bg-white">User</option>
                    <option value="ADMIN" className="text-brand-dark bg-white">Admin</option>
                    <option value="SUPER_ADMIN" className="text-brand-dark bg-white">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-dark mb-1">Durum</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="isActive" checked={formData.isActive === true} onChange={() => setFormData({...formData, isActive: true})} className="w-4 h-4 text-brand-primary" />
                    <span className="text-brand-dark">Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-red-600">
                    <input type="radio" name="isActive" checked={formData.isActive === false} onChange={() => setFormData({...formData, isActive: false})} className="w-4 h-4 text-red-600" />
                    <span>Pasif</span>
                  </label>
                </div>
                <p className="text-xs text-brand-dark/50 mt-1">Pasif yapılan kullanıcılar sisteme giriş yapamaz.</p>
              </div>
              
              <div className="pt-4 border-t border-brand-dark/10 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 font-bold text-brand-dark/70 hover:bg-brand-dark/5 rounded-xl transition-colors">İptal</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-70 transition-colors">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmState.isOpen}
        title="Kullanıcıyı Sil"
        message="Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="Vazgeç"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmState({ isOpen: false })}
      />
    </div>
  )
}
