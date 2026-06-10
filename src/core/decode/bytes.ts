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
