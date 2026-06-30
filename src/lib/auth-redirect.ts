/** URL de retorno após clicar no link de redefinição de senha do Supabase */
export const PASSWORD_RESET_PATH = '/login/redefinir-senha'

export function getPasswordResetRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${PASSWORD_RESET_PATH}`
  }
  return `http://localhost:3000${PASSWORD_RESET_PATH}`
}
