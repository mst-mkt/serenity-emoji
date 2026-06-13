import { concat, u16, u32 } from '../bytes'
import { checksum, pad4, prefixSums, struct, tag } from './write'

export type Table = { tag: string; data: Uint8Array }
export type Sfnt = ReturnType<typeof assembleSfnt>

const HEADER_SIZE = 12
const RECORD_SIZE = 16
const CHECKSUM_MAGIC = 0xb1b0afba

// sorted/offsets/checksums describe the assembled font, so woff packaging reuses them as-is
export const assembleSfnt = (tables: Table[]) => {
  const sorted = tables.toSorted((a, b) => (a.tag < b.tag ? -1 : 1))
  const padded = sorted.map(({ data }) => pad4(data))
  const tableStart = HEADER_SIZE + sorted.length * RECORD_SIZE
  const offsets = prefixSums(
    padded.map(({ length }) => length),
    tableStart,
  )
  const checksums = sorted.map(({ data }) => checksum(data))

  const entrySelector = Math.floor(Math.log2(sorted.length))
  const searchRange = 2 ** entrySelector * 16
  const header = struct([
    ['sfntVersion', u32(0x00010000)],
    ['numTables', u16(sorted.length)],
    ['searchRange', u16(searchRange)],
    ['entrySelector', u16(entrySelector)],
    ['rangeShift', u16(sorted.length * 16 - searchRange)],
  ])
  const records = concat(
    sorted.map(({ tag: name, data }, index) =>
      struct([
        ['tag', tag(name)],
        ['checksum', u32(checksums[index])],
        ['offset', u32(offsets[index])],
        ['length', u32(data.length)],
      ]),
    ),
  )

  const font = concat([header, records, ...padded])
  const headIndex = sorted.findIndex(({ tag: name }) => name === 'head')

  if (headIndex >= 0) {
    const adjustment = (CHECKSUM_MAGIC - checksum(font) + 2 ** 32) % 2 ** 32
    font.set(u32(adjustment), offsets[headIndex] + 8)
  }

  return { font, sorted, offsets, checksums }
}

export const toSfnt = (tables: Table[]) => assembleSfnt(tables).font
