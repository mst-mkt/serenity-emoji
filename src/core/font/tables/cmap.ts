import { concat } from '../../decode/bytes'
import { i16, prefixSums, struct, u16, u32, withSections } from '../write'

type Group = { start: number; end: number; glyph: number }
type Segment = { start: number; end: number; glyphs: number[] }

const extendsGroup = (
  group: Group | undefined,
  codePoint: number,
  glyph: number,
): group is Group => {
  if (group === undefined) return false

  const extendsCodePoints = codePoint === group.end + 1
  const extendsGlyphs = glyph === group.glyph + (group.end - group.start) + 1

  return extendsCodePoints && extendsGlyphs
}

// format 12 groups: runs where codepoint and glyph id advance together
const toGroups = (entries: [number, number][]) => {
  return entries.reduce<Group[]>((groups, [codePoint, glyph]) => {
    const last = groups.at(-1)
    if (extendsGroup(last, codePoint, glyph)) {
      last.end = codePoint
      return groups
    }

    groups.push({ start: codePoint, end: codePoint, glyph })
    return groups
  }, [])
}

const format12 = (entries: [number, number][]) => {
  const groups = toGroups(entries)
  const records = concat(
    groups.map(({ start, end, glyph }) =>
      struct([
        ['startCharCode', u32(start)],
        ['endCharCode', u32(end)],
        ['startGlyphId', u32(glyph)],
      ]),
    ),
  )

  return struct([
    ['format', u16(12)],
    ['reserved', u16(0)],
    ['length', u32(16 + records.length)],
    ['language', u32(0)],
    ['numGroups', u32(groups.length)],
    ['groups', records],
  ])
}

// format 4 segments: runs of consecutive codepoints, glyph ids via glyphIdArray
const toSegments = (entries: [number, number][]) => {
  return entries.reduce<Segment[]>((segments, [codePoint, glyph]) => {
    const last = segments.at(-1)
    if (last !== undefined && codePoint === last.end + 1) {
      last.end = codePoint
      last.glyphs.push(glyph)
      return segments
    }

    segments.push({ start: codePoint, end: codePoint, glyphs: [glyph] })
    return segments
  }, [])
}

const format4 = (entries: [number, number][]) => {
  const segments = toSegments(entries)
  const segCount = segments.length + 1
  const glyphStarts = prefixSums(segments.map(({ glyphs }) => glyphs.length))
  const glyphIds = segments.flatMap(({ glyphs }) => glyphs)
  const entrySelector = Math.floor(Math.log2(segCount))
  const searchRange = 2 ** (entrySelector + 1)
  const length = 16 + segCount * 8 + glyphIds.length * 2

  return struct([
    ['format', u16(4)],
    ['length', u16(length)],
    ['language', u16(0)],
    ['segCountX2', u16(segCount * 2)],
    ['searchRange', u16(searchRange)],
    ['entrySelector', u16(entrySelector)],
    ['rangeShift', u16(segCount * 2 - searchRange)],
    ['endCode', concat([...segments.map(({ end }) => u16(end)), u16(0xffff)])],
    ['reservedPad', u16(0)],
    ['startCode', concat([...segments.map(({ start }) => u16(start)), u16(0xffff)])],
    ['idDelta', concat([...segments.map(() => i16(0)), i16(1)])],
    [
      'idRangeOffset',
      concat([
        ...segments.map((_, index) => u16(2 * (segCount - index + glyphStarts[index]))),
        u16(0),
      ]),
    ],
    ['glyphIdArray', concat(glyphIds.map(u16))],
  ])
}

export const buildCmap = (cmap: Map<number, number>) => {
  const entries = [...cmap].toSorted(([a], [b]) => a - b)
  const bmp = entries.filter(([codePoint]) => codePoint < 0xffff)
  const sub4 = format4(bmp)
  const sub12 = format12(entries)

  return withSections(
    (offsetOf) =>
      struct([
        ['version', u16(0)],
        ['numTables', u16(2)],
        ['bmpPlatformId', u16(3)],
        ['bmpEncodingId', u16(1)],
        ['bmpSubtableOffset', u32(offsetOf('sub4'))],
        ['fullPlatformId', u16(3)],
        ['fullEncodingId', u16(10)],
        ['fullSubtableOffset', u32(offsetOf('sub12'))],
      ]),
    [
      ['sub4', sub4],
      ['sub12', sub12],
    ],
  )
}
