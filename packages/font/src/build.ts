import type { DotGrid } from '@serenity-emoji/image/dot-grid'

import { type ColorTable, planFont } from './plan'
import { assembleSfnt, type Table } from './sfnt'
import { buildCbdt } from './tables/cbdt'
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

export type FontFormat = 'ttf' | 'woff'
export type { ColorTable } from './plan'

type FontPlan = ReturnType<typeof planFont>
type BuildOptions = { colorTable?: ColorTable }

const colrTables = (plan: FontPlan) => {
  if (plan.palette.length === 0) return []

  return [
    { tag: 'COLR', data: buildColr(plan.colorBases) },
    { tag: 'CPAL', data: buildCpal(plan.palette) },
  ]
}

const cbdtTables = async (plan: FontPlan) => {
  const { cbdt, cblc } = await buildCbdt(plan.bitmaps)

  return [
    { tag: 'CBDT', data: cbdt },
    { tag: 'CBLC', data: cblc },
  ]
}

const buildTables = (plan: FontPlan, colorTables: Table[]) => {
  const { glyf, loca, bounds } = buildGlyf(plan.glyphs)

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

export const buildFonts = async (grids: Map<string, DotGrid>, options: BuildOptions = {}) => {
  const { colorTable = 'colr' } = options
  const plan = planFont(grids, colorTable)
  const colorTables = colorTable === 'colr' ? colrTables(plan) : await cbdtTables(plan)

  const sfnt = assembleSfnt(buildTables(plan, colorTables))
  const woff = await toWoff(sfnt)

  return { ttf: sfnt.font, woff }
}
