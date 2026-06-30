# Republicar Edge Function create-employee-login (Windows)
# Uso: .\scripts\deploy-create-employee-login.ps1

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

Write-Host "Diretorio: $ProjectRoot" -ForegroundColor Cyan

$indexPath = Join-Path $ProjectRoot "supabase\functions\create-employee-login\index.ts"
if (-not (Test-Path -LiteralPath $indexPath)) {
  Write-Host "ERRO: Arquivo nao encontrado:" -ForegroundColor Red
  Write-Host $indexPath
  exit 1
}

Write-Host "Arquivo OK: $indexPath" -ForegroundColor Green
supabase functions deploy create-employee-login --project-ref jdtgfqdpecnsjjajlhsk
