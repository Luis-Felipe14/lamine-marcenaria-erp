# Republicar Edge Functions de autenticação (Windows)
# Uso: .\scripts\deploy-auth-functions.ps1

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

Write-Host "Diretorio: $ProjectRoot" -ForegroundColor Cyan

$functions = @(
  "create-employee-login",
  "reset-user-password"
)

foreach ($fn in $functions) {
  $indexPath = Join-Path $ProjectRoot "supabase\functions\$fn\index.ts"
  if (-not (Test-Path -LiteralPath $indexPath)) {
    Write-Host "ERRO: Arquivo nao encontrado:" -ForegroundColor Red
    Write-Host $indexPath
    exit 1
  }
  Write-Host "Deploy: $fn" -ForegroundColor Green
  supabase functions deploy $fn --project-ref jdtgfqdpecnsjjajlhsk
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao publicar $fn" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

Write-Host "Concluido." -ForegroundColor Cyan
