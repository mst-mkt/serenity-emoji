import { textCodePoints } from '@serenity-emoji/emoji'
import { buildFonts, type FontFormat } from '@serenity-emoji/font/build'
import { type FontFile } from '@serenity-emoji/font/webfont/file-name'
import { parseRange } from '@serenity-emoji/font/webfont/range'
import {
  FULL_SUBSET,
  manifestOf,
  selectByCodePoints,
  selectByRange,
  splitBySubset,
} from '@serenity-emoji/font/webfont/subsets'
import { type DotGrid } from '@serenity-emoji/image/dot-grid'
import { sha256Hex } from '@serenity-emoji/lib/digest'

import { getFontLatest, putFont, putFontBuilt, putFontManifest } from '../storage/fonts'
import { getAllGrids } from '../storage/grids'

const buildAndStore = async (subset: string, grids: Map<string, DotGrid>) => {
  const fonts = await buildFonts(grids)
  await Promise.all([putFont(fonts.ttf, subset, 'ttf'), putFont(fonts.woff, subset, 'woff')])

  return fonts
}

export const buildFontSubsets = async (target: string) => {
  const grids = await getAllGrids()
  if (grids.size === 0) return

  const buckets = splitBySubset(grids)

  await buildAndStore(FULL_SUBSET, grids)
  for (const [subset, subGrids] of buckets) {
    await buildAndStore(subset, subGrids)
  }

  const manifest = [{ subset: FULL_SUBSET, range: null }, ...manifestOf(buckets)]
  await putFontManifest(manifest)
  await putFontBuilt(target)
}

const cacheAndPick = async (subset: string, grids: Map<string, DotGrid>, format: FontFormat) => {
  if (grids.size === 0) return null

  const fonts = await buildAndStore(subset, grids)
  return fonts[format]
}

// lazy build for an arbitrary contiguous range; the R2 put doubles as the cache for later requests
export const buildRangeFont = async (parsed: FontFile) => {
  if (parsed.digest !== null) return null

  const range = parseRange(parsed.subset)
  if (range === null) return null

  const grids = await getAllGrids()
  return cacheAndPick(parsed.subset, selectByRange(grids, range), parsed.format)
}

const textSubset = async (codePoints: Set<number>) => {
  const sorted = [...codePoints].toSorted((a, b) => a - b)
  const bytes = new Uint8Array(new TextEncoder().encode(sorted.join(',')))
  const hex = await sha256Hex(bytes)

  return `text-${hex.slice(0, 16)}`
}

// build a font covering exactly the text's codepoints; keyed by their digest so texts never collide
export const buildTextFont = async (text: string, format: FontFormat) => {
  const codePoints = textCodePoints(text)
  if (codePoints.size === 0) return null

  const subset = await textSubset(codePoints)
  const cached = await getFontLatest(subset, format)
  if (cached !== null) return { body: cached.body, etag: cached.httpEtag }

  const grids = await getAllGrids()
  const built = await cacheAndPick(subset, selectByCodePoints(grids, codePoints), format)
  return built === null ? null : { body: built, etag: undefined }
}
