import { concat } from '../../lib/bytes'

const le16 = (value: number) => {
  return Uint8Array.from([value & 0xff, (value >> 8) & 0xff])
}

const le32 = (value: number) => {
  return Uint8Array.from([
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  ])
}

// the directory dimension byte is 0 for 256 and up; the embedded png holds the true size
const dirByte = (size: number) => (size >= 256 ? 0 : size)

// wrap a png as a single-entry ICO, reading its dimensions from the IHDR
export const toIco = (png: Uint8Array) => {
  const ihdr = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const width = ihdr.getUint32(16)
  const height = ihdr.getUint32(20)

  const header = concat([le16(0), le16(1), le16(1)])
  const entry = concat([
    Uint8Array.from([dirByte(width), dirByte(height), 0, 0]),
    le16(1),
    le16(32),
    le32(png.length),
    le32(header.length + 16),
  ])

  return concat([header, entry, png])
}
