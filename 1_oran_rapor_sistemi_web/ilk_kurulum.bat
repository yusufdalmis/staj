@echo off
title ORAN Rapor Sistemi - Ilk Kurulum
echo ORAN Rapor Sistemi kuruluyor...
echo.
echo Lutfen Docker Desktop uygulamasinin calistigindan emin olun!
echo.
pause

echo.
echo Docker imajlari olusturuluyor ve baslatiliyor...
docker compose down -v 2>nul || docker-compose down -v
docker compose up -d --build 2>nul || docker-compose up -d --build

echo.
echo Veritabani ve sunucu ayarlaniyor (Lutfen 30 saniye bekleyin)...
timeout /t 30 /nobreak

echo.
echo Veritabani tablolari otomatik olarak arka planda olusturuluyor...

echo.
echo Kurulum Tamamlandi! 
echo Yonetici E-posta: admin@oran.org.tr
echo Sifre: admin123
echo.
echo Tarayicinizda http://localhost:8003 adresine gidebilirsiniz.
pause
