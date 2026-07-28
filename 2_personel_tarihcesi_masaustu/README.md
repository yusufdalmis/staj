# Personel Tarihçesi ve Özgeçmiş Yönetim Merkezi (Masaüstü Uygulaması)

ORAN Kalkınma Ajansı İnsan Kaynakları ve Personel Özgeçmiş Yönetimi için geliştirilmiş CustomTkinter tabanlı Python masaüstü yazılımı.

## Özellikler
- **Akıllı PDF Parsing Engine (`extract_to_db.py`):** Kurum bordro belgelerinden unvan ve birim eşleştirme.
- **Otomatik Tekilleştirme Engine'i (`db_updates.py`):** Mükerrer personel kayıtlarını birleştirme.
- **Canlı Filtreleme & Arama (`cv_management_window.py`):** Anlık arama ve birim/unvan süzgeçleri.
- **Dinamik HTML & PDF CV Raporlama (`generate_html_report.py`):** Kurumsal CV ve görev dökümü.
- **PDF İşlem Araçları (`pdf_editor_window.py`):** PDF birleştirme ve sayfa bölme.
- **Excel Raporlama Engine'i (`export_to_excel.py`):** Kurumsal renk biçimlendirmeli çıktı.

## Kurulum ve Çalıştırma

### Bağımlılıkların Yüklenmesi
```bash
pip install customtkinter pdfplumber pymupdf openpyxl pandas pyinstaller
```

### Uygulamayı Çalıştırma
```bash
python main_app.py
```

### Executable (.exe) Derleme
```bash
pyinstaller PersonelUygulamasi.spec
```
