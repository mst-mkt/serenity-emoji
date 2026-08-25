import { sValidator } from '@hono/standard-validator'
import { toStem } from '@serenity-emoji/emoji'
import {
  COLOR_FORMATS,
  COLOR_STRING_FORMATS,
  formatColor,
} from '@serenity-emoji/image/color/format'
import { toAnsi } from '@serenity-emoji/image/render/ansi'
import { toCsv } from '@serenity-emoji/image/render/csv'
import { toIco } from '@serenity-emoji/image/render/ico'
import { toIterm } from '@serenity-emoji/image/render/iterm'
import { toKitty } from '@serenity-emoji/image/render/kitty'
import { toPng } from '@serenity-emoji/image/render/png'
import { toSixel } from '@serenity-emoji/image/render/sixel'
import { toSvg } from '@serenity-emoji/image/render/svg'
import { scaleToFit } from '@serenity-emoji/image/scale'
import { toSquare } from '@serenity-emoji/image/square'
import { Hono } from 'hono'
import * as v from 'valibot'

import type { AppEnv } from '../bindings'
import { findGrid } from '../storage/grids'
import { licenseHeaderMiddleware } from './middlewares/license'

const CACHE_CONTROL = 'public, max-age=3600'
const DEFAULT_SIZE = 512

const ParamSchema = v.object({
  emoji: v.pipe(v.string(), v.transform(toStem)),
})

const QuerySchema = v.object({
  size: v.optional(
    v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1), v.maxValue(2048)),
  ),
  square: v.optional(
    v.pipe(
      v.string(),
      v.transform((value: string) => value === '' || value === 'true' || value === '1'),
    ),
  ),
})

const JsonQuerySchema = v.object({
  ...QuerySchema.entries,
  format: v.optional(v.picklist(COLOR_FORMATS), 'object'),
})

const CsvQuerySchema = v.object({
  ...QuerySchema.entries,
  format: v.optional(v.picklist(COLOR_STRING_FORMATS), 'hex'),
  separator: v.optional(v.pipe(v.string(), v.minLength(1)), ','),
})

const loadGrid = async (stem: string, square: boolean | undefined) => {
  const grid = await findGrid(stem)
  return grid === null || !square ? grid : toSquare(grid)
}

export const emojiRoutes = new Hono<AppEnv>()
  .use(licenseHeaderMiddleware)
  .get(
    '/:emoji',
    sValidator('param', ParamSchema),
    sValidator('query', JsonQuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square, format } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const wantsJson = c.req.header('accept')?.includes('application/json') ?? false
      const isCurl = c.req.header('user-agent')?.startsWith('curl/') ?? false
      const headers = { 'cache-control': CACHE_CONTROL, vary: 'user-agent, accept' }

      if (wantsJson) {
        const colored = scaleToFit(grid, size).map((row) =>
          row.map((color) => formatColor(color, format)),
        )
        return c.json(colored, 200, headers)
      }
      if (isCurl) return c.text(toAnsi(scaleToFit(grid, size)), 200, headers)

      const png = await toPng(grid, { size: size ?? DEFAULT_SIZE })
      return c.body(png, 200, { ...headers, 'content-type': 'image/png' })
    },
  )
  .get(
    '/:emoji/json',
    sValidator('param', ParamSchema),
    sValidator('query', JsonQuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square, format } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const scaled = scaleToFit(grid, size)
      const colored = scaled.map((row) => row.map((color) => formatColor(color, format)))

      return c.json(colored, 200, { 'cache-control': CACHE_CONTROL })
    },
  )
  .get(
    '/:emoji/ansi',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const scaled = scaleToFit(grid, size)

      return c.text(toAnsi(scaled), 200, { 'cache-control': CACHE_CONTROL })
    },
  )
  .get(
    '/:emoji/png',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const pngSize = size ?? DEFAULT_SIZE
      const png = await toPng(grid, { size: pngSize })

      return c.body(png, 200, { 'content-type': 'image/png', 'cache-control': CACHE_CONTROL })
    },
  )
  .get(
    '/:emoji/svg',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const svg = toSvg(grid, { size })

      return c.body(svg, 200, { 'content-type': 'image/svg+xml', 'cache-control': CACHE_CONTROL })
    },
  )
  .get(
    '/:emoji/sixel',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const sixel = toSixel(scaleToFit(grid, size ?? DEFAULT_SIZE))

      return c.body(sixel, 200, { 'content-type': 'image/sixel', 'cache-control': CACHE_CONTROL })
    },
  )
  .get(
    '/:emoji/ico',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      // ICO directory dimensions are one byte, so an entry caps at 256
      const png = await toPng(grid, { size: Math.min(size ?? 256, 256) })
      const ico = toIco(png)

      return c.body(ico, 200, { 'content-type': 'image/x-icon', 'cache-control': CACHE_CONTROL })
    },
  )
  .get(
    '/:emoji/iterm',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const png = await toPng(grid, { size: size ?? DEFAULT_SIZE })
      const iterm = toIterm(png)

      return c.body(iterm, 200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': CACHE_CONTROL,
      })
    },
  )
  .get(
    '/:emoji/kitty',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const png = await toPng(grid, { size: size ?? DEFAULT_SIZE })
      const kitty = toKitty(png)

      return c.body(kitty, 200, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': CACHE_CONTROL,
      })
    },
  )
  .get(
    '/:emoji/csv',
    sValidator('param', ParamSchema),
    sValidator('query', CsvQuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square, format, separator } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const csv = toCsv(scaleToFit(grid, size), format, separator)

      return c.body(csv, 200, {
        'content-type': 'text/csv; charset=utf-8',
        'cache-control': CACHE_CONTROL,
      })
    },
  )
