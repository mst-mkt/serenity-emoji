import type { DotGrid } from '../dot-grid'
import { planFont } from './plan'
import { assembleSfnt } from './sfnt'
import { buildCmap } from './tables/cmap'
import { buildColr, buildCpal } from './tables/colr'
import { buildGlyf } from './tables/glyf'
import { buildGsub } from './tables/gsub'
import {
  buildHead,
  buildHhea,
  buildHmtx,
  buildMaxp,
  buildName,
  buildOs2,
  buildPost,
} from './tables/metadata'
import { toWoff } from './woff'

const buildTables = (grids: Map<string, DotGrid>) => {
  const plan = planFont(grids)
  const { glyf, loca, bounds } = buildGlyf(plan.glyphs)

  const colorTables =
    plan.palette.length === 0
      ? []
      : [
          { tag: 'COLR', data: buildColr(plan.colorBases) },
          { tag: 'CPAL', data: buildCpal(plan.palette) },
        ]
  const gsubTables =
    plan.ligatures.length === 0 ? [] : [{ tag: 'GSUB', data: buildGsub(plan.ligatures) }]

  return [
    { tag: 'head', data: buildHead(bounds) },
    { tag: 'hhea', data: buildHhea(plan.glyphs, bounds) },
    { tag: 'maxp', data: buildMaxp(plan.glyphs) },
    { tag: 'hmtx', data: buildHmtx(plan.glyphs, bounds) },
    { tag: 'cmap', data: buildCmap(plan.cmap) },
    { tag: 'glyf', data: glyf },
    { tag: 'loca', data: loca },
    { tag: 'name', data: buildName() },
    { tag: 'OS/2', data: buildOs2(plan.glyphs, plan.cmap, plan.maxContext) },
    { tag: 'post', data: buildPost() },
    ...colorTables,
    ...gsubTables,
  ]
}

export const buildFonts = async (grids: Map<string, DotGrid>) => {
  const sfnt = assembleSfnt(buildTables(grids))
  const woff = await toWoff(sfnt)

  return { ttf: sfnt.font, woff }
}
