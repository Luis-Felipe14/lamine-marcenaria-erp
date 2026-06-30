@echo off
chcp 65001 >nul
title Laminê ERP — Servidor de desenvolvimento

cd /d "%~dp0"

echo.
echo  ========================================
echo   Laminê ERP — Iniciando servidor local
echo  ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo        Instale em: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Dependencias nao instaladas. Executando npm install...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
  echo.
)

if not exist ".env" (
  echo [AVISO] Arquivo .env nao encontrado.
  if exist ".env.example" (
    echo         Copie .env.example para .env e configure o Supabase.
  )
  echo.
)

echo Servidor: http://localhost:5173
echo O navegador abrira automaticamente.
echo Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.

call npm run dev -- --open

if errorlevel 1 (
  echo.
  echo [ERRO] O servidor nao iniciou corretamente.
  pause
  exit /b 1
)

pause
