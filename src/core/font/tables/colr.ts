import { concat } from '../../decode/bytes'
import type { Rgba } from '../../dot-grid'
import type { ColorBase } from '../plan'
import { prefixSums, u16, u32 } from '../write'

const COLR_HEADER_SIZE = 14
const CPAL_HEADER_SIZE = 14

// base glyph records must arrive sorted by glyph id for binary search
export const buildColr = (bases: ColorBase[]) => {
  const layerStarts = prefixSums(bases.map(({ layers }) => layers.length))
  const numLayers = layerStarts.at(-1) ?? 0

  return concat([
    u16(0),
    u16(bases.length),
    u32(COLR_HEADER_SIZE),
    u32(COLR_HEADER_SIZE + bases.length * 6),
    u16(numLayers),
    ...bases.map(({ glyph, layers }, index) =>
      concat([u16(glyph), u16(layerStarts[index]), u16(layers.length)]),
    ),
    ...bases.flatMap(({ layers }) =>
      layers.map(({ glyph, palette }) => concat([u16(glyph), u16(palette)])),
    ),
  ])
}

export const buildCpal = (palette: Rgba[]) => {
  return concat([
    u16(0),
    u16(palette.length),
    u16(1),
    u16(palette.length),
    u32(CPAL_HEADER_SIZE),
    u16(0),
    ...palette.map(({ r, g, b, a }) => Uint8Array.from([b, g, r, a])),
  ])
}
