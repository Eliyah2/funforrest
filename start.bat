@echo off
title FunForest App
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is niet geinstalleerd.
  echo  Installeer hem eerst via https://nodejs.org en start dit bestand opnieuw.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo  Eerste keer? Dependencies installeren, even geduld...
  echo.
  call npm install
)

echo.
echo  FunForest starten... scan straks de QR-code met Expo Go.
echo.
call npx expo start
pause
