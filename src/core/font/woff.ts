import { concat } from '../decode/bytes'
import { deflate } from '../zlib'
import type { Sfnt } from './sfnt'
import { pad4, prefixSums, tag, u16, u32 } from './write'

const HEADER_SIZE = 44
const ENTRY_SIZE = 20
const SFNT_VERSION = 0x00010000
const RESERVED = u16(0)
const FONT_VERSION = [u16(1), u16(0)]
// metaOffset, metaLength, metaOrigLength, privOffset, privLength
const NO_META_OR_PRIVATE = [u32(0), u32(0), u32(0), u32(0), u32(0)]

// woff requires stored tables to be strictly smaller than the original, raw otherwise
const smallerOf = (original: Uint8Array, compressed: Uint8Array) => {
  return compressed.length < original.length ? compressed : original
}

export const toWoff = async ({ font, sorted, offsets, checksums }: Sfnt) => {
  // table bytes as they appear in the sfnt, so head carries the patched checksum adjustment
  const originals = sorted.map(({ data }, index) =>
    font.subarray(offsets[index], offsets[index] + data.length),
  )
  const stored = await Promise.all(
    originals.map(async (original) => smallerOf(original, await deflate(original))),
  )

  const padded = stored.map(pad4)
  const dataStart = HEADER_SIZE + sorted.length * ENTRY_SIZE
  const storedOffsets = prefixSums(
    padded.map(({ length }) => length),
    dataStart,
  )
  const fileLength = padded.reduce((sum, { length }) => sum + length, dataStart)

  const header = concat([
    tag('wOFF'),
    u32(SFNT_VERSION),
    u32(fileLength),
    u16(sorted.length),
    RESERVED,
    u32(font.length),
    ...FONT_VERSION,
    ...NO_META_OR_PRIVATE,
  ])

  // origChecksum matches the sfnt directory, where head is summed with a zero adjustment
  const directory = concat(
    sorted.map(({ tag: name, data }, index) =>
      concat([
        tag(name),
        u32(storedOffsets[index]),
        u32(stored[index].length),
        u32(data.length),
        u32(checksums[index]),
      ]),
    ),
  )

  return concat([header, directory, ...padded])
}
