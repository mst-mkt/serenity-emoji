import { concat } from '../../decode/bytes'
import { ASCENT, DESCENT, type Rect, UNITS_PER_EM } from '../glyphs'
import type { PlannedGlyph } from '../plan'
import { i16, prefixSums, tag, u16, u32 } from '../write'
import { boundsOf, type GlyphBounds } from './glyf'

const HEAD_MAGIC = 0x5f0f3cf5
// baseline at y=0, lsb at x=0, force integer ppem
const HEAD_FLAGS = 0x000b

const isBounds = (bounds: GlyphBounds): bounds is Rect => bounds !== null

// created/modified stay zero so identical input bytes give identical fonts
export const buildHead = (bounds: GlyphBounds[]) => {
  const boxes = bounds.filter(isBounds)
  if (boxes.length === 0) throw new Error('font: no visible glyphs')

  const { xMin, yMin, xMax, yMax } = boundsOf(boxes)

  return concat([
    u16(1),
    u16(0),
    u32(0x00010000),
    u32(0),
    u32(HEAD_MAGIC),
    u16(HEAD_FLAGS),
    u16(UNITS_PER_EM),
    new Uint8Array(8),
    new Uint8Array(8),
    i16(xMin),
    i16(yMin),
    i16(xMax),
    i16(yMax),
    u16(0),
    u16(8),
    i16(2),
    i16(1),
    i16(0),
  ])
}

export const buildHhea = (glyphs: PlannedGlyph[], bounds: GlyphBounds[]) => {
  const advanceMax = glyphs.reduce((max, { advance }) => Math.max(max, advance), 0)
  const paired = glyphs.flatMap(({ advance }, index) => {
    const box = bounds[index]
    return box === null ? [] : [{ advance, box }]
  })
  const minLsb = paired.reduce((min, { box }) => Math.min(min, box.xMin), 0)
  const minRsb = paired.reduce((min, { advance, box }) => Math.min(min, advance - box.xMax), 0)
  const extent = paired.reduce((max, { box }) => Math.max(max, box.xMax), 0)

  return concat([
    u16(1),
    u16(0),
    i16(ASCENT),
    i16(DESCENT),
    i16(0),
    u16(advanceMax),
    i16(minLsb),
    i16(minRsb),
    i16(extent),
    i16(1),
    i16(0),
    i16(0),
    i16(0),
    i16(0),
    i16(0),
    i16(0),
    i16(0),
    u16(glyphs.length),
  ])
}

export const buildMaxp = (glyphs: PlannedGlyph[]) => {
  const maxContours = glyphs.reduce((max, { rects }) => Math.max(max, rects.length), 0)

  return concat([
    u32(0x00010000),
    u16(glyphs.length),
    u16(maxContours * 4),
    u16(maxContours),
    u16(0),
    u16(0),
    u16(2),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
  ])
}

export const buildHmtx = (glyphs: PlannedGlyph[], bounds: GlyphBounds[]) =>
  concat(glyphs.map(({ advance }, index) => concat([u16(advance), i16(bounds[index]?.xMin ?? 0)])))

const NAMES = [
  [1, 'Serenity Emoji'],
  [2, 'Regular'],
  [3, 'Serenity Emoji 1.0'],
  [4, 'Serenity Emoji'],
  [5, 'Version 1.0'],
  [6, 'SerenityEmoji-Regular'],
] as const satisfies readonly (readonly [number, string])[]

const utf16be = (value: string) => {
  return Uint8Array.from({ length: value.length * 2 }, (_, index) => {
    const code = value.charCodeAt(index >> 1)
    return index % 2 === 0 ? (code >> 8) & 255 : code & 255
  })
}

export const buildName = () => {
  const encoded = NAMES.map(([id, value]) => ({ id, data: utf16be(value) }))
  const starts = prefixSums(encoded.map(({ data }) => data.length))

  return concat([
    u16(0),
    u16(encoded.length),
    u16(6 + encoded.length * 12),
    ...encoded.map(({ id, data }, index) =>
      concat([u16(3), u16(1), u16(0x0409), u16(id), u16(data.length), u16(starts[index])]),
    ),
    ...encoded.map(({ data }) => data),
  ])
}

export const buildOs2 = (glyphs: PlannedGlyph[], cmap: Map<number, number>, maxContext: number) => {
  const first = cmap.keys().reduce((min, cp) => Math.min(min, cp), 0x10ffff)
  const last = cmap.keys().reduce((max, cp) => Math.max(max, cp), 0)
  const total = glyphs.reduce((sum, { advance }) => sum + advance, 0)

  return concat([
    u16(4),
    i16(Math.round(total / glyphs.length)),
    u16(400),
    u16(5),
    u16(0),
    i16(512),
    i16(512),
    i16(0),
    i16(0),
    i16(512),
    i16(512),
    i16(0),
    i16(0),
    i16(51),
    i16(256),
    i16(0),
    new Uint8Array(10),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
    tag('SREN'),
    u16(0x0040),
    u16(Math.min(first, 0xffff)),
    u16(Math.min(last, 0xffff)),
    i16(ASCENT),
    i16(DESCENT),
    i16(0),
    u16(ASCENT),
    u16(-DESCENT),
    u32(0),
    u32(0),
    i16(0),
    i16(0),
    u16(0),
    u16(0x20),
    u16(maxContext),
  ])
}

export const buildPost = () => {
  return concat([
    u32(0x00030000),
    u32(0),
    i16(-100),
    i16(50),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
    u32(0),
  ])
}
