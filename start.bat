@echo off
echo UYAP Dosya Karsilastirma Masaustu Uygulamasi baslatiliyor...
echo.

cd /d "%~dp0"

echo Bagimliliklari kontrol ediliyor...
call npm install

echo.
echo Tauri uygulamasi baslatiliyor...
call npm run tauri:dev
