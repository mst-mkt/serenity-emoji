import { concat, u16, u32 } from '@serenity-emoji/lib/bytes'
import { deflate } from '@serenity-emoji/lib/zlib'

import type { Sfnt } from './sfnt'
import { pad4, prefixSums, struct, tag } from './write'

const HEADER_SIZE = 44
const ENTRY_SIZE = 20
const SFNT_VERSION = 0x00010000

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

  const header = struct([
    ['signature', tag('wOFF')],
    ['flavor', u32(SFNT_VERSION)],
    ['length', u32(fileLength)],
    ['numTables', u16(sorted.length)],
    ['reserved', u16(0)],
    ['totalSfntSize', u32(font.length)],
    ['majorVersion', u16(1)],
    ['minorVersion', u16(0)],
    ['metaOffset', u32(0)],
    ['metaLength', u32(0)],
    ['metaOrigLength', u32(0)],
    ['privOffset', u32(0)],
    ['privLength', u32(0)],
  ])

  // origChecksum matches the sfnt directory, where head is summed with a zero adjustment
  const directory = concat(
    sorted.map(({ tag: name, data }, index) =>
      struct([
        ['tag', tag(name)],
        ['offset', u32(storedOffsets[index])],
        ['compLength', u32(stored[index].length)],
        ['origLength', u32(data.length)],
        ['origChecksum', u32(checksums[index])],
      ]),
    ),
  )

  return concat([header, directory, ...padded])
}
