import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { FilePlus, FileText, ClipboardList } from "lucide-react"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-16 md:pt-4">
      <div>
        <h1 className="text-3xl font-bold text-brand-dark">Hoş Geldiniz, {session?.user?.name}</h1>
        <p className="text-brand-dark/70 mt-2">
          Haftalık ve yıllık faaliyet raporlarınızı buradan yönetebilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/rapor-giris" className="group block">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-dark/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-brand-primary/30 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center mb-6 shrink-0">
              <FilePlus className="text-brand-primary w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark mb-2">Yeni Faaliyet Girişi</h3>
            <p className="text-brand-dark/60 text-sm flex-grow">
              Haftalık, yıllık faaliyetlerinizi veya çalışma programınızı buradan hızlıca sisteme ekleyin.
            </p>
          </div>
        </Link>

        <Link href="/dashboard/haftalik-faaliyetler" className="group block">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-dark/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/30 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 shrink-0">
              <FileText className="text-blue-500 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark mb-2">Haftalık Faaliyetler</h3>
            <p className="text-brand-dark/60 text-sm flex-grow">
              Girdiğiniz haftalık raporları görüntüleyin, düzenleyin veya Word çıktısı alın.
            </p>
          </div>
        </Link>

        <Link href="/dashboard/yillik-faaliyetler" className="group block">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-dark/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500/30 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 shrink-0">
              <FileText className="text-indigo-500 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark mb-2">Yıllık Faaliyetler</h3>
            <p className="text-brand-dark/60 text-sm flex-grow">
              Yıllık ara raporlarınızı detaylı tablolar halinde inceleyin ve yönetin.
            </p>
          </div>
        </Link>

        <Link href="/dashboard/calisma-programlari" className="group block">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-dark/5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-purple-500/30 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 shrink-0">
              <ClipboardList className="text-purple-500 w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-brand-dark mb-2">Çalışma Programı</h3>
            <p className="text-brand-dark/60 text-sm flex-grow">
              Kurumunuzun çalışma programlarını, hedeflerini ve durumlarını detaylıca inceleyin.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
