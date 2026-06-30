import type { PostgrestError } from '@supabase/supabase-js'

export function throwIfError(error: PostgrestError | null, context?: string): void {
  if (error) {
    console.error(context ? `[Supabase] ${context}:` : '[Supabase]', error.message)
    throw error
  }
}

export function emptyToNull<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data }
  for (const key of Object.keys(result)) {
    if (result[key] === '') result[key] = null
  }
  return result
}
