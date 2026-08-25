import { concat, i16, u16, u32 } from '@serenity-emoji/lib/bytes'

import { fontNameRecords } from '../../attribution'
import { ASCENT, DESCENT, type Rect, UNITS_PER_EM } from '../glyphs'
import type { PlannedGlyph } from '../plan'
import { prefixSums, struct, tag, withSections } from '../write'
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

  return struct([
    ['majorVersion', u16(1)],
    ['minorVersion', u16(0)],
    ['fontRevision', u32(0x00010000)],
    ['checksumAdjustment', u32(0)],
    ['magicNumber', u32(HEAD_MAGIC)],
    ['flags', u16(HEAD_FLAGS)],
    ['unitsPerEm', u16(UNITS_PER_EM)],
    ['created', new Uint8Array(8)],
    ['modified', new Uint8Array(8)],
    ['xMin', i16(xMin)],
    ['yMin', i16(yMin)],
    ['xMax', i16(xMax)],
    ['yMax', i16(yMax)],
    ['macStyle', u16(0)],
    ['lowestRecPpem', u16(8)],
    ['fontDirectionHint', i16(2)],
    ['indexToLocFormat', i16(1)],
    ['glyphDataFormat', i16(0)],
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

  return struct([
    ['majorVersion', u16(1)],
    ['minorVersion', u16(0)],
    ['ascender', i16(ASCENT)],
    ['descender', i16(DESCENT)],
    ['lineGap', i16(0)],
    ['advanceWidthMax', u16(advanceMax)],
    ['minLeftSideBearing', i16(minLsb)],
    ['minRightSideBearing', i16(minRsb)],
    ['xMaxExtent', i16(extent)],
    ['caretSlopeRise', i16(1)],
    ['caretSlopeRun', i16(0)],
    ['caretOffset', i16(0)],
    ['reserved0', i16(0)],
    ['reserved1', i16(0)],
    ['reserved2', i16(0)],
    ['reserved3', i16(0)],
    ['metricDataFormat', i16(0)],
    ['numberOfHMetrics', u16(glyphs.length)],
  ])
}

export const buildMaxp = (glyphs: PlannedGlyph[]) => {
  const maxContours = glyphs.reduce((max, { rects }) => Math.max(max, rects.length), 0)

  return struct([
    ['version', u32(0x00010000)],
    ['numGlyphs', u16(glyphs.length)],
    ['maxPoints', u16(maxContours * 4)],
    ['maxContours', u16(maxContours)],
    ['maxCompositePoints', u16(0)],
    ['maxCompositeContours', u16(0)],
    ['maxZones', u16(2)],
    ['maxTwilightPoints', u16(0)],
    ['maxStorage', u16(0)],
    ['maxFunctionDefs', u16(0)],
    ['maxInstructionDefs', u16(0)],
    ['maxStackElements', u16(0)],
    ['maxSizeOfInstructions', u16(0)],
    ['maxComponentElements', u16(0)],
    ['maxComponentDepth', u16(0)],
  ])
}

export const buildHmtx = (glyphs: PlannedGlyph[], bounds: GlyphBounds[]) =>
  concat(
    glyphs.map(({ advance }, index) =>
      struct([
        ['advanceWidth', u16(advance)],
        ['lsb', i16(bounds[index]?.xMin ?? 0)],
      ]),
    ),
  )

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
  const all = [...NAMES, ...fontNameRecords()].toSorted(([a], [b]) => a - b)
  const encoded = all.map(([id, value]) => ({ id, data: utf16be(value) }))
  const starts = prefixSums(encoded.map(({ data }) => data.length))

  const records = concat(
    encoded.map(({ id, data }, index) =>
      struct([
        ['platformId', u16(3)],
        ['encodingId', u16(1)],
        ['languageId', u16(0x0409)],
        ['nameId', u16(id)],
        ['length', u16(data.length)],
        ['stringOffset', u16(starts[index])],
      ]),
    ),
  )
  const storage = concat(encoded.map(({ data }) => data))

  return withSections(
    (offsetOf) =>
      struct([
        ['format', u16(0)],
        ['count', u16(encoded.length)],
        ['storageOffset', u16(offsetOf('storage'))],
      ]),
    [
      ['records', records],
      ['storage', storage],
    ],
  )
}

export const buildOs2 = (glyphs: PlannedGlyph[], cmap: Map<number, number>, maxContext: number) => {
  const first = cmap.keys().reduce((min, cp) => Math.min(min, cp), 0x10ffff)
  const last = cmap.keys().reduce((max, cp) => Math.max(max, cp), 0)
  const total = glyphs.reduce((sum, { advance }) => sum + advance, 0)

  return struct([
    ['version', u16(4)],
    ['xAvgCharWidth', i16(Math.round(total / glyphs.length))],
    ['usWeightClass', u16(400)],
    ['usWidthClass', u16(5)],
    ['fsType', u16(0)],
    ['ySubscriptXSize', i16(512)],
    ['ySubscriptYSize', i16(512)],
    ['ySubscriptXOffset', i16(0)],
    ['ySubscriptYOffset', i16(0)],
    ['ySuperscriptXSize', i16(512)],
    ['ySuperscriptYSize', i16(512)],
    ['ySuperscriptXOffset', i16(0)],
    ['ySuperscriptYOffset', i16(0)],
    ['yStrikeoutSize', i16(51)],
    ['yStrikeoutPosition', i16(256)],
    ['sFamilyClass', i16(0)],
    ['panose', new Uint8Array(10)],
    ['ulUnicodeRange1', u32(0)],
    ['ulUnicodeRange2', u32(0)],
    ['ulUnicodeRange3', u32(0)],
    ['ulUnicodeRange4', u32(0)],
    ['achVendID', tag('SREN')],
    ['fsSelection', u16(0x0040)],
    ['usFirstCharIndex', u16(Math.min(first, 0xffff))],
    ['usLastCharIndex', u16(Math.min(last, 0xffff))],
    ['sTypoAscender', i16(ASCENT)],
    ['sTypoDescender', i16(DESCENT)],
    ['sTypoLineGap', i16(0)],
    ['usWinAscent', u16(ASCENT)],
    ['usWinDescent', u16(-DESCENT)],
    ['ulCodePageRange1', u32(0)],
    ['ulCodePageRange2', u32(0)],
    ['sxHeight', i16(0)],
    ['sCapHeight', i16(0)],
    ['usDefaultChar', u16(0)],
    ['usBreakChar', u16(0x20)],
    ['usMaxContext', u16(maxContext)],
  ])
}

export const buildPost = () => {
  return struct([
    ['version', u32(0x00030000)],
    ['italicAngle', u32(0)],
    ['underlinePosition', i16(-100)],
    ['underlineThickness', i16(50)],
    ['isFixedPitch', u32(0)],
    ['minMemType42', u32(0)],
    ['maxMemType42', u32(0)],
    ['minMemType1', u32(0)],
    ['maxMemType1', u32(0)],
  ])
}
