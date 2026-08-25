// CRC-32 (ISO 3309) lookup table, one entry per byte value
const CRC_TABLE = [...Array(256)].map(
  (_, n) =>
    [...Array(8)].reduce<number>((crc) => (crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1), n) >>>
    0,
)

export const crc32 = (bytes: Uint8Array) => {
  return (
    (bytes.reduce(
      (crc, byte) => (CRC_TABLE.at((crc ^ byte) & 255) ?? 0) ^ (crc >>> 8),
      0xffffffff,
    ) ^
      0xffffffff) >>>
    0
  )
}

export const concat = (parts: Uint8Array[]) => {
  const merged = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  parts.reduce((at, part) => {
    merged.set(part, at)
    return at + part.length
  }, 0)
  return merged
}

export const u8 = (value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new Error(`u8 out of range: ${value}`)
  }

  return Uint8Array.from([value])
}

export const i8 = (value: number) => {
  if (!Number.isInteger(value) || value < -0x80 || value > 0x7f) {
    throw new Error(`i8 out of range: ${value}`)
  }

  return u8(value < 0 ? value + 0x100 : value)
}

export const u16 = (value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error(`u16 out of range: ${value}`)
  }

  return Uint8Array.from([(value >>> 8) & 255, value & 255])
}

export const i16 = (value: number) => {
  if (!Number.isInteger(value) || value < -0x8000 || value > 0x7fff) {
    throw new Error(`i16 out of range: ${value}`)
  }

  return u16(value < 0 ? value + 0x10000 : value)
}

export const u32 = (value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`u32 out of range: ${value}`)
  }

  return Uint8Array.from([
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ])
}

export const hex = (byte: number) => byte.toString(16).padStart(2, '0')

export const toHex = (bytes: Uint8Array) => [...bytes].map(hex).join('')
