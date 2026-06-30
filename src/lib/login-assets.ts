import { supabase } from '@/lib/supabase'

export const LOGIN_ASSETS_BUCKET = 'login-assets'
export const LOGIN_VIDEO_OBJECT = 'login-video.mp4'
const LOCAL_LOGIN_VIDEO_SRC = '/login/login-video.mp4'

export function getLoginVideoPublicUrl(objectPath = LOGIN_VIDEO_OBJECT): string {
  const { data } = supabase.storage.from(LOGIN_ASSETS_BUCKET).getPublicUrl(objectPath)
  return data.publicUrl
}

/**
 * Produção: Supabase Storage (bucket login-assets).
 * Desenvolvimento: arquivo local em public/login/ (se existir).
 * Override opcional: VITE_LOGIN_VIDEO_URL com URL completa.
 */
export function getLoginVideoSrc(): string {
  const override = import.meta.env.VITE_LOGIN_VIDEO_URL?.trim()
  if (override) return override

  if (import.meta.env.DEV) {
    return LOCAL_LOGIN_VIDEO_SRC
  }

  return getLoginVideoPublicUrl()
}
