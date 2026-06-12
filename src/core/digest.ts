export const sha256Hex = async (bytes: Uint8Array) => {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

  return hex
}
