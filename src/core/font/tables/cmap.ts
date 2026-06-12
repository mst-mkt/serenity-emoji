import { concat } from '../../decode/bytes'
import { i16, prefixSums, u16, u32 } from '../write'

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
  const length = 16 + groups.length * 12

  return concat([
    u16(12),
    u16(0),
    u32(length),
    u32(0),
    u32(groups.length),
    ...groups.map(({ start, end, glyph }) => concat([u32(start), u32(end), u32(glyph)])),
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

  return concat([
    u16(4),
    u16(length),
    u16(0),
    u16(segCount * 2),
    u16(searchRange),
    u16(entrySelector),
    u16(segCount * 2 - searchRange),
    ...segments.map(({ end }) => u16(end)),
    u16(0xffff),
    u16(0),
    ...segments.map(({ start }) => u16(start)),
    u16(0xffff),
    ...segments.map(() => i16(0)),
    i16(1),
    ...segments.map((_, index) => u16(2 * (segCount - index + glyphStarts[index]))),
    u16(0),
    ...glyphIds.map(u16),
  ])
}

export const buildCmap = (cmap: Map<number, number>) => {
  const entries = [...cmap].toSorted(([a], [b]) => a - b)
  const bmp = entries.filter(([codePoint]) => codePoint < 0xffff)
  const sub4 = format4(bmp)
  const sub12 = format12(entries)
  const sub4Offset = 4 + 2 * 8

  return concat([
    u16(0),
    u16(2),
    u16(3),
    u16(1),
    u32(sub4Offset),
    u16(3),
    u16(10),
    u32(sub4Offset + sub4.length),
    sub4,
    sub12,
  ])
}
