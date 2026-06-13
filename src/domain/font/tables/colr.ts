import { concat, u16, u32 } from '../../../lib/bytes'
import type { Rgba } from '../../dot-grid'
import type { ColorBase } from '../plan'
import { prefixSums, struct, withSections } from '../write'

// base glyph records must arrive sorted by glyph id for binary search
export const buildColr = (bases: ColorBase[]) => {
  const layerStarts = prefixSums(bases.map(({ layers }) => layers.length))
  const numLayers = layerStarts.at(-1) ?? 0

  const baseRecords = concat(
    bases.map(({ glyph, layers }, index) =>
      struct([
        ['glyphId', u16(glyph)],
        ['firstLayerIndex', u16(layerStarts[index])],
        ['numLayers', u16(layers.length)],
      ]),
    ),
  )
  const layerRecords = concat(
    bases.flatMap(({ layers }) =>
      layers.map(({ glyph, palette }) =>
        struct([
          ['glyphId', u16(glyph)],
          ['paletteIndex', u16(palette)],
        ]),
      ),
    ),
  )

  return withSections(
    (offsetOf) =>
      struct([
        ['version', u16(0)],
        ['numBaseGlyphRecords', u16(bases.length)],
        ['baseGlyphRecordsOffset', u32(offsetOf('baseRecords'))],
        ['layerRecordsOffset', u32(offsetOf('layerRecords'))],
        ['numLayerRecords', u16(numLayers)],
      ]),
    [
      ['baseRecords', baseRecords],
      ['layerRecords', layerRecords],
    ],
  )
}

export const buildCpal = (palette: Rgba[]) => {
  const colorRecords = concat(palette.map(({ r, g, b, a }) => Uint8Array.from([b, g, r, a])))

  return withSections(
    (offsetOf) =>
      struct([
        ['version', u16(0)],
        ['numPaletteEntries', u16(palette.length)],
        ['numPalettes', u16(1)],
        ['numColorRecords', u16(palette.length)],
        ['colorRecordsArrayOffset', u32(offsetOf('colorRecords'))],
        ['colorRecordIndices', u16(0)],
      ]),
    [['colorRecords', colorRecords]],
  )
}
