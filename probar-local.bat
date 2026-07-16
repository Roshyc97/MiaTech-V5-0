@echo off
REM ==== MiaTech - prueba local (Windows) ====
cd /d "%~dp0"
set PHP=php
where php >nul 2>nul || set PHP=C:\xampp\php\php.exe
if not exist "%PHP%" if "%PHP%"=="C:\xampp\php\php.exe" (
  echo No se encontro PHP. Instala XAMPP o agrega php al PATH.
  pause
  exit /b 1
)
echo Creando/actualizando base de datos local (SQLite)...
"%PHP%" tools\migrate.php --seed
echo.
echo ============================================================
echo  Servidor local en:  http://localhost:8000
echo  Deja esta ventana ABIERTA. Cierra con Ctrl+C.
echo ============================================================
"%PHP%" -S localhost:8000 -t public_html server-local.php
pause
