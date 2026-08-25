import type { DotGrid } from '@serenity-emoji/image/dot-grid'
import { toPng } from '@serenity-emoji/image/render/png'
import { dimensionsOf, scaleToFit } from '@serenity-emoji/image/scale'
import { concat, i8, u8, u16, u32 } from '@serenity-emoji/lib/bytes'

import { ASCENT, DESCENT, UNITS_PER_EM } from '../glyphs'
import { prefixSums, struct } from '../write'

export type BitmapEntry = { glyph: number; grid: DotGrid }

// strike resolution, following the noto color emoji convention
export const STRIKE_PPEM = 128

const PNG_IMAGE_FORMAT = 17
const RGBA_BIT_DEPTH = 32
const HORIZONTAL_METRICS = 0x01

const CBDT_HEADER_SIZE = 4
const CBLC_HEADER_SIZE = 8
const BITMAP_SIZE_RECORD_SIZE = 48
const SUBTABLE_ARRAY_SIZE = 8

type BitmapGlyph = { width: number; height: number; bearingX: number; bearingY: number }

const px = (units: number) => Math.round((units * STRIKE_PPEM) / UNITS_PER_EM)

// mirrors toGlyph's placement: one em square, centered, baseline at ASCENT from the top
const toBitmapGlyph = (grid: DotGrid) => {
  const scaled = scaleToFit(grid, STRIKE_PPEM)
  const { width, height } = dimensionsOf(scaled)
  const bearingX = Math.round((STRIKE_PPEM - width) / 2)
  const bearingY = px(ASCENT) - Math.round((STRIKE_PPEM - height) / 2)

  return { scaled, metrics: { width, height, bearingX, bearingY } }
}

// format 17: small glyph metrics followed by length-prefixed png data
const glyphRecord = ({ width, height, bearingX, bearingY }: BitmapGlyph, png: Uint8Array) =>
  struct([
    ['height', u8(height)],
    ['width', u8(width)],
    ['bearingX', i8(bearingX)],
    ['bearingY', i8(bearingY)],
    ['advance', u8(STRIKE_PPEM)],
    ['dataLen', u32(png.length)],
    ['data', png],
  ])

const maxOf = (values: number[]) => values.reduce((max, value) => Math.max(max, value))
const minOf = (values: number[]) => values.reduce((min, value) => Math.min(min, value))

const horiLineMetrics = (glyphs: BitmapGlyph[]) => {
  const widthMax = maxOf(glyphs.map(({ width }) => width))
  const minOriginSB = minOf(glyphs.map(({ bearingX }) => bearingX))
  const minAdvanceSB = minOf(glyphs.map(({ bearingX, width }) => STRIKE_PPEM - bearingX - width))
  const maxBeforeBL = maxOf(glyphs.map(({ bearingY }) => bearingY))
  const minAfterBL = minOf(glyphs.map(({ bearingY, height }) => bearingY - height))

  return struct([
    ['ascender', i8(px(ASCENT))],
    ['descender', i8(px(DESCENT))],
    ['widthMax', u8(widthMax)],
    ['caretSlopeNumerator', i8(1)],
    ['caretSlopeDenominator', i8(0)],
    ['caretOffset', i8(0)],
    ['minOriginSB', i8(minOriginSB)],
    ['minAdvanceSB', i8(minAdvanceSB)],
    ['maxBeforeBL', i8(maxBeforeBL)],
    ['minAfterBL', i8(minAfterBL)],
    ['pad1', i8(0)],
    ['pad2', i8(0)],
  ])
}

const buildCblc = (glyphs: BitmapGlyph[], firstGlyph: number, recordLengths: number[]) => {
  const lastGlyph = firstGlyph + glyphs.length - 1
  const offsets = prefixSums(recordLengths)

  // index format 1: one offset per glyph plus a final end offset, relative to imageDataOffset
  const subtable = struct([
    ['indexFormat', u16(1)],
    ['imageFormat', u16(PNG_IMAGE_FORMAT)],
    ['imageDataOffset', u32(CBDT_HEADER_SIZE)],
    ['sbitOffsets', concat(offsets.map(u32))],
  ])
  const subtableArray = struct([
    ['firstGlyphIndex', u16(firstGlyph)],
    ['lastGlyphIndex', u16(lastGlyph)],
    ['additionalOffsetToIndexSubtable', u32(SUBTABLE_ARRAY_SIZE)],
  ])
  const bitmapSize = struct([
    ['indexSubTableArrayOffset', u32(CBLC_HEADER_SIZE + BITMAP_SIZE_RECORD_SIZE)],
    ['indexTablesSize', u32(subtableArray.length + subtable.length)],
    ['numberOfIndexSubTables', u32(1)],
    ['colorRef', u32(0)],
    ['hori', horiLineMetrics(glyphs)],
    ['vert', new Uint8Array(12)],
    ['startGlyphIndex', u16(firstGlyph)],
    ['endGlyphIndex', u16(lastGlyph)],
    ['ppemX', u8(STRIKE_PPEM)],
    ['ppemY', u8(STRIKE_PPEM)],
    ['bitDepth', u8(RGBA_BIT_DEPTH)],
    ['flags', i8(HORIZONTAL_METRICS)],
  ])
  const header = struct([
    ['majorVersion', u16(3)],
    ['minorVersion', u16(0)],
    ['numSizes', u32(1)],
  ])

  return concat([header, bitmapSize, subtableArray, subtable])
}

const isContiguous = (entries: BitmapEntry[], firstGlyph: number) =>
  entries.every(({ glyph }, index) => glyph === firstGlyph + index)

export const buildCbdt = async (entries: BitmapEntry[]) => {
  const firstGlyph = entries.at(0)?.glyph
  if (firstGlyph === undefined) throw new Error('font: no bitmap glyphs')
  if (!isContiguous(entries, firstGlyph)) {
    throw new Error('font: bitmap glyphs must be contiguous')
  }

  const planned = entries.map(({ grid }) => toBitmapGlyph(grid))
  const pngs = await Promise.all(planned.map(({ scaled }) => toPng(scaled, { metadata: false })))
  const records = planned.map(({ metrics }, index) => glyphRecord(metrics, pngs[index]))

  const header = struct([
    ['majorVersion', u16(3)],
    ['minorVersion', u16(0)],
  ])
  return {
    cbdt: concat([header, ...records]),
    cblc: buildCblc(
      planned.map(({ metrics }) => metrics),
      firstGlyph,
      records.map(({ length }) => length),
    ),
  }
}
