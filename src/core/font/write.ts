import { concat } from '../decode/bytes'

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

export const tag = (value: string) => {
  if (value.length !== 4) throw new Error(`tag must be 4 characters: ${value}`)

  return new TextEncoder().encode(value)
}

export const pad4 = (data: Uint8Array) => {
  const rest = data.length % 4

  return rest === 0 ? data : concat([data, new Uint8Array(4 - rest)])
}

// sfnt checksum: sum of big-endian uint32 words, trailing bytes zero-padded
export const checksum = (data: Uint8Array) => {
  return data.reduce((sum, byte, index) => {
    const placeInWord = 3 - (index % 4)
    const weighted = byte * 2 ** (placeInWord * 8)

    return (sum + weighted) % 2 ** 32
  }, 0)
}

// cumulative offsets: [start, start + l0, start + l0 + l1, ...]
export const prefixSums = (lengths: number[], start = 0) => {
  return lengths.reduce<number[]>(
    (sums, length) => {
      sums.push((sums.at(-1) ?? start) + length)
      return sums
    },
    [start],
  )
}
