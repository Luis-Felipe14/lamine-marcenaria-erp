/** Domínio interno do Supabase Auth (não usado no dia a dia) */
export const LOGIN_EMAIL_DOMAIN = 'login.lamine.internal'

/** Normaliza para comparação: sem acento, maiúsculas, espaços simples */
export function normalizeUsername(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Slug para e-mail interno do Auth */
export function usernameToAuthEmail(username: string): string {
  const slug = normalizeUsername(username)
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
  if (!slug) throw new Error('Usuário inválido')
  return `${slug}@${LOGIN_EMAIL_DOMAIN}`
}

export function isInternalAuthEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${LOGIN_EMAIL_DOMAIN}`)
}

/** Exibe usuário amigável a partir do e-mail interno ou do campo username */
export function displayUsername(username: string | null | undefined, email: string): string {
  if (username?.trim()) return username.trim()
  if (isInternalAuthEmail(email)) {
    const local = email.split('@')[0] ?? ''
    return local.replace(/\./g, ' ').toUpperCase()
  }
  return email
}

export function isValidUsername(username: string): boolean {
  const normalized = normalizeUsername(username)
  return normalized.length >= 2 && normalized.length <= 40
}

/** Sugere usuário a partir do nome (ex: Antônio Edvandro -> ANTONIO E) */
export function suggestUsernameFromName(fullName: string): string {
  const parts = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].toUpperCase().slice(0, 20)
  const first = parts[0].toUpperCase()
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase()
  return `${first} ${lastInitial}`
}

/** Resolve identificador de login (usuário ou e-mail real de gestor) */
export function resolveLoginEmail(identifier: string): string {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  return usernameToAuthEmail(trimmed)
}
