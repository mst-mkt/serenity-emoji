import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ARTWORK_MAX_DIMENSION, stemOfEmojiFile } from '@serenity-emoji/emoji'
import {
  buildFonts,
  COLOR_TABLES,
  type ColorTable,
  type FontFormat,
} from '@serenity-emoji/font/build'
import { formatFontFile } from '@serenity-emoji/font/webfont/file-name'
import { planSubsets } from '@serenity-emoji/font/webfont/subsets'
import { decodePng } from '@serenity-emoji/image/decode'
import type { DotGrid } from '@serenity-emoji/image/dot-grid'
import { chunk } from '@serenity-emoji/lib/chunk'
import { define } from 'gunshi'

import { fail, reasonOf } from '../libs/fail'

// stay well below common `ulimit -n` soft limits
const OPEN_FILE_LIMIT = 64

const readGrid = async (emojiDir: string, file: string, stem: string) => {
  const bytes = await readFile(join(emojiDir, file)).catch((cause) => {
    return fail(`failed to read ${file}: ${reasonOf(cause)}`)
  })
  const grid = await decodePng(bytes, { maxDimension: ARTWORK_MAX_DIMENSION }).catch((cause) => {
    return fail(`failed to decode ${file}: ${reasonOf(cause)}`)
  })

  return [stem, grid] as const
}

const readGrids = async (emojiDir: string) => {
  const files = await readdir(emojiDir).catch((cause) => {
    return fail(`failed to read ${emojiDir}: ${reasonOf(cause)}`)
  })
  const entries = files.flatMap((file) => {
    const stem = stemOfEmojiFile(file)
    return stem === null ? [] : [{ file, stem }]
  })

  const emptyPairs = Promise.resolve<(readonly [string, DotGrid])[]>([])
  const pairs = await chunk(entries, OPEN_FILE_LIMIT).reduce(async (read, batch) => {
    const done = await read
    const batchPairs = batch.map(({ file, stem }) => readGrid(emojiDir, file, stem))
    const results = await Promise.all(batchPairs)
    return [...done, ...results]
  }, emptyPairs)

  return new Map(pairs)
}

const writeSubset = async (
  outDir: string,
  subset: string,
  grids: Map<string, DotGrid>,
  colorTable: ColorTable,
) => {
  const fonts = await buildFonts(grids, { colorTable })

  // woff is only served on the web, which uses the colr flavor
  const formats: FontFormat[] = colorTable === 'colr' ? ['ttf', 'woff'] : ['ttf']

  await Promise.all(
    formats.map((format) =>
      writeFile(join(outDir, formatFontFile({ subset, digest: null, format })), fonts[format]),
    ),
  )
}

export const buildCommand = define({
  name: 'build',
  description: 'Build font subsets and their manifest from emoji artwork',
  args: {
    emojiDir: {
      type: 'positional',
      description: 'Directory containing the upstream emoji png files',
    },
    outDir: {
      type: 'positional',
      description: 'Directory to write the fonts and manifest into',
    },
    colorTable: {
      type: 'enum',
      choices: COLOR_TABLES,
      default: 'colr',
      toKebab: true,
      description: 'Color glyph table: colr vector layers or cbdt pixel bitmaps',
    },
  },
  run: async (ctx) => {
    const { emojiDir, outDir, colorTable } = ctx.values

    const grids = await readGrids(emojiDir)
    if (grids.size === 0) {
      return fail(`no emoji found in ${emojiDir}`)
    }

    const { subsets, manifest } = planSubsets(grids)

    try {
      await mkdir(outDir, { recursive: true })
      await Promise.all(
        [...subsets].map(([subset, subsetGrids]) =>
          writeSubset(outDir, subset, subsetGrids, colorTable),
        ),
      )
      await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest))
    } catch (cause) {
      return fail(`failed to write into ${outDir}: ${reasonOf(cause)}`)
    }

    console.log(`built ${subsets.size} subsets from ${grids.size} emoji into ${outDir}`)
  },
})
