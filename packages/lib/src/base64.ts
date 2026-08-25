const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const base64 = (bytes: Uint8Array) => {
  const groups = [...Array(Math.ceil(bytes.length / 3))].map((_, i) => {
    const offset = i * 3
    const a = bytes.at(offset) ?? 0
    const b = bytes.at(offset + 1) ?? 0
    const c = bytes.at(offset + 2) ?? 0
    const triple = (a << 16) | (b << 8) | c
    const remaining = bytes.length - offset

    return [
      ALPHABET.charAt((triple >> 18) & 0x3f),
      ALPHABET.charAt((triple >> 12) & 0x3f),
      remaining >= 2 ? ALPHABET.charAt((triple >> 6) & 0x3f) : '=',
      remaining >= 3 ? ALPHABET.charAt(triple & 0x3f) : '=',
    ].join('')
  })

  return groups.join('')
}
