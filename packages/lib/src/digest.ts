import { toHex } from './bytes'

export const sha256Hex = async (bytes: Uint8Array<ArrayBuffer>) => {
  const hash = await crypto.subtle.digest('SHA-256', bytes)

  return toHex(new Uint8Array(hash))
}
