@echo off
echo ==============================================
echo Rapor Sistemi - Ilk Kurulum ve Baslatma Araci
echo ==============================================

IF NOT EXIST ".env" (
    echo [.env] dosyasi bulunamadi. [.env.example] dosyasindan kopyalaniyor...
    copy .env.example .env
    echo Lutfen .env dosyasini acip NEXTAUTH_SECRET ve sifreleri guvenli bir sekilde degistirin.
    echo Bu islemden sonra baslat.bat dosyasini tekrar calistirin.
    pause
    exit /b
)

echo.
echo Docker container'lari olusturuluyor ve baslatiliyor...
docker compose up -d --build

echo.
echo ==============================================
echo Sistem basariyla baslatildi!
echo http://localhost:8003 adresinden ulasabilirsiniz.
echo ==============================================
pause
