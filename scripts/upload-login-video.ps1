# Envia o vídeo da tela de login para o Supabase Storage.
# Requer: Supabase CLI logado e projeto linkado (supabase link).
#
# Uso:
#   .\scripts\upload-login-video.ps1
#   .\scripts\upload-login-video.ps1 -Path "C:\caminho\meu-video.mp4"

param(
  [string]$Path = (Join-Path $PSScriptRoot "..\public\login\login-video.mp4")
)

$object = "login-video.mp4"
$bucket = "ss:///login-assets/$object"

if (-not (Test-Path $Path)) {
  Write-Error "Arquivo não encontrado: $Path"
  exit 1
}

$sizeMb = [math]::Round((Get-Item $Path).Length / 1MB, 1)
Write-Host "Enviando $Path ($sizeMb MB) para $bucket ..."

npx supabase storage cp $Path $bucket --experimental

if ($LASTEXITCODE -ne 0) {
  Write-Error "Falha no upload. Verifique: supabase login, supabase link e migration 042 aplicada."
  exit $LASTEXITCODE
}

Write-Host "Upload concluído. URL pública (após deploy):"
Write-Host "  {VITE_SUPABASE_URL}/storage/v1/object/public/login-assets/$object"
