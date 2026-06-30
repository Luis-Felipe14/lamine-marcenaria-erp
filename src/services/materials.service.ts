import { supabase } from '@/lib/supabase'

const BUCKET = 'material-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function validateMaterialImage(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Formato inválido. Use JPG, PNG ou WebP.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('A imagem deve ter no máximo 5 MB.')
  }
}

export async function uploadMaterialImage(file: File, materialId: string): Promise<string> {
  validateMaterialImage(file)

  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${materialId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type,
    })

  if (error) throw new Error(`Não foi possível enviar a foto: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
