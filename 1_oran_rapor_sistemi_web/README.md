# ORAN Rapor Sistemi

Bu sistem Orta Anadolu Kalkınma Ajansı (ORAN) için geliştirilmiş Haftalık ve Yıllık Faaliyet Raporları Yönetim Sistemidir.

## Kurulum ve Çalıştırma

USB üzerinden veya herhangi bir sistemden sıfırdan çalıştırmak için şu adımları izleyin:

### Gereksinimler
- **Docker Desktop**'ın bilgisayarda kurulu ve çalışır durumda olması gerekmektedir.

### Başlatma Adımları
1. Sistem dosyalarının bulunduğu klasörü (bu README dosyasının olduğu klasör) bilgisayarınıza kopyalayın veya USB üzerinden açın.
2. İlk defa çalıştırıyorsanız **`ilk_kurulum.bat`** dosyasına çift tıklayın. Bu işlem gerekli konteynerleri oluşturacak, veritabanını başlatacak ve ilk ayarları (şirket çalışanlarının e-posta adresleri vb.) yükleyecektir.
3. Sonraki çalıştırmalarda sadece **`baslat.bat`** dosyasını kullanabilirsiniz.
4. Tarayıcınızdan şu adrese giderek sisteme erişebilirsiniz:
   - **http://localhost:8003**

## Kullanıcılar ve Giriş Bilgileri

Sistem ilk kurulduğunda birim çalışanları otomatik olarak veritabanına eklenir. E-posta adresleri isim.soyisim@oran.org.tr formatındadır (Türkçe karakterler düzeltilmiştir).

- **Varsayılan Şifre (Tüm Kullanıcılar İçin):** `Oran2026`
- **Sistem Yöneticisi:** `admin@oran.org.tr` (Şifre: `admin123`)

*(Not: Mehmet Okur kullanıcısı ayrıldığı için sisteme dahil edilmemiştir.)*

## Port Yapılandırması
- Web Arayüzü: `8003`
- PostgreSQL Veritabanı: `8004` (Sadece dışarıdan bağlantı ihtiyacı olursa kullanılır, varsayılan olarak kapalıdır).
