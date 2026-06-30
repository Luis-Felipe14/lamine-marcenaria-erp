export function generateTemporaryPassword(length = 10): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}
