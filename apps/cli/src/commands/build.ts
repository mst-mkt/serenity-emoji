import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ARTWORK_MAX_DIMENSION, stemOfEmojiFile } from '@serenity-emoji/emoji'
import { buildFonts } from '@serenity-emoji/font/build'
import { formatFontFile } from '@serenity-emoji/font/webfont/file-name'
import { planSubsets } from '@serenity-emoji/font/webfont/subsets'
import { decodePng } from '@serenity-emoji/image/decode'
import type { DotGrid } from '@serenity-emoji/image/dot-grid'
import { chunk } from '@serenity-emoji/lib/chunk'
import { define } from 'gunshi'

// stay well below common `ulimit -n` soft limits
const OPEN_FILE_LIMIT = 64

const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

const reasonOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))

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

const writeSubset = async (outDir: string, subset: string, grids: Map<string, DotGrid>) => {
  const fonts = await buildFonts(grids)

  await Promise.all([
    writeFile(join(outDir, formatFontFile({ subset, digest: null, format: 'ttf' })), fonts.ttf),
    writeFile(join(outDir, formatFontFile({ subset, digest: null, format: 'woff' })), fonts.woff),
  ])
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
  },
  run: async (ctx) => {
    const { emojiDir, outDir } = ctx.values

    const grids = await readGrids(emojiDir)
    if (grids.size === 0) {
      fail(`no emoji found in ${emojiDir}`)
    }

    const { subsets, manifest } = planSubsets(grids)

    try {
      await mkdir(outDir, { recursive: true })
      await Promise.all(
        [...subsets].map(([subset, subsetGrids]) => writeSubset(outDir, subset, subsetGrids)),
      )
      await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest))
    } catch (cause) {
      fail(`failed to write into ${outDir}: ${reasonOf(cause)}`)
    }

    console.log(`built ${subsets.size} subsets from ${grids.size} emoji into ${outDir}`)
  },
})
