import { concat } from '../decode/bytes'
import { checksum, pad4, prefixSums, tag, u16, u32 } from './write'

export type Table = { tag: string; data: Uint8Array }

const HEADER_SIZE = 12
const RECORD_SIZE = 16
const CHECKSUM_MAGIC = 0xb1b0afba

export const toSfnt = (tables: Table[]) => {
  const sorted = tables.toSorted((a, b) => (a.tag < b.tag ? -1 : 1))
  const padded = sorted.map(({ data }) => pad4(data))
  const tableStart = HEADER_SIZE + sorted.length * RECORD_SIZE
  const offsets = prefixSums(
    padded.map(({ length }) => length),
    tableStart,
  )

  const entrySelector = Math.floor(Math.log2(sorted.length))
  const searchRange = 2 ** entrySelector * 16
  const header = concat([
    u32(0x00010000),
    u16(sorted.length),
    u16(searchRange),
    u16(entrySelector),
    u16(sorted.length * 16 - searchRange),
  ])
  const records = concat(
    sorted.map(({ tag: name, data }, index) =>
      concat([tag(name), u32(checksum(data)), u32(offsets[index]), u32(data.length)]),
    ),
  )

  const font = concat([header, records, ...padded])
  const headIndex = sorted.findIndex(({ tag: name }) => name === 'head')

  if (headIndex >= 0) {
    const adjustment = (CHECKSUM_MAGIC - checksum(font) + 2 ** 32) % 2 ** 32
    font.set(u32(adjustment), offsets[headIndex] + 8)
  }

  return font
}
