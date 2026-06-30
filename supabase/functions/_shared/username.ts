export const LOGIN_EMAIL_DOMAIN = 'login.lamine.internal'

export function normalizeUsername(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function usernameToAuthEmail(username: string): string {
  const slug = normalizeUsername(username)
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
  if (!slug) throw new Error('Usuário inválido')
  return `${slug}@${LOGIN_EMAIL_DOMAIN}`
}

export function isValidUsername(username: string): boolean {
  const n = normalizeUsername(username)
  return n.length >= 2 && n.length <= 40
}
