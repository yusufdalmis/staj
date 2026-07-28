# ORAN Kalkınma Ajansı - Staj Projeleri Toplu Deposu (`stajOran`)

Bu depo, ORAN Kalkınma Ajansı bünyesindeki staj sürecinde geliştirilen 2 temel yazılım projesini ve teknik dokümantasyon belgesini içermektedir.

---

## 📁 Depo İçeriği

```
stajOran/
├── 🌐 1_oran_rapor_sistemi_web/          # Next.js, Prisma, PostgreSQL & Nodemailer Web Tabanlı Raporlama Sistemi
├── 🖥️ 2_personel_tarihcesi_masaustu/    # Python, CustomTkinter, SQLite & pdfplumber Masaüstü Yönetim Merkezi
└── 📄 yusuf_guncel.docx                   # Kapsamlı Staj Raporu ve Teknik Dokümantasyon
```

---

### 🌐 1. ORAN Rapor Sistemi (Web Uygulaması)
* **Teknolojiler:** Next.js (v15/v16), React, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, Nodemailer, node-cron, Docker.
* **Açıklama:** Kurum personelinin haftalık ve yıllık faaliyet raporlarını girmesini, yöneticilerin ise onay/red ve mühlet takiplerini yapmasını sağlayan web platformu.
* **Çalıştırma:**
  ```bash
  cd 1_oran_rapor_sistemi_web
  npm install
  npx prisma generate
  npm run dev
  ```

---

### 🖥️ 2. Personel Tarihçesi ve Özgeçmiş Yönetim Merkezi (Masaüstü Uygulaması)
* **Teknolojiler:** Python 3, CustomTkinter, SQLite, pdfplumber, PyMuPDF, openpyxl, pandas, PyInstaller.
* **Açıklama:** Kurum arşivindeki geçmiş yıl bordro PDF belgelerinden otomatik veri ayrıştırma, mükerrer kayıt tekilleştirme ve dinamik CV/Excel rapor üretme yazılımı.
* **Çalıştırma:**
  ```bash
  cd 2_personel_tarihcesi_masaustu
  pip install customtkinter pdfplumber pymupdf openpyxl pandas
  python main_app.py
  ```

---

### 🔒 KVKK ve Veri Güvenliği
Bu depodaki tüm veritabanı örnekleri ve test belgeleri anonimleştirilmiş olup, KVKK standartlarına uygun olarak kişisel veri (PDF bordro, canlı veritabanı, gerçek e-posta) içermemektedir.
