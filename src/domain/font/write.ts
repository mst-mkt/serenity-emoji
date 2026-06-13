import { concat } from '../../lib/bytes'

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

export const struct = (fields: [string, Uint8Array][]) => {
  return concat(fields.map(([, bytes]) => bytes))
}

// header is built twice: once at zero to size it, then with the resolved section offsets
export const withSections = (
  header: (offsetOf: (section: string) => number) => Uint8Array,
  sections: [string, Uint8Array][],
) => {
  const headerSize = header(() => 0).length
  const offsets = prefixSums(
    sections.map(([, bytes]) => bytes.length),
    headerSize,
  )
  const offsetOf = (section: string) => {
    const index = sections.findIndex(([name]) => name === section)
    if (index < 0) throw new Error(`unknown section: ${section}`)
    return offsets[index]
  }

  return concat([header(offsetOf), ...sections.map(([, bytes]) => bytes)])
}
