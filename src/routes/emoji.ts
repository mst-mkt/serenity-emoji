import { sValidator } from '@hono/standard-validator'
import { Hono } from 'hono'
import * as v from 'valibot'

import type { AppEnv } from '../bindings'
import { toStem } from '../domain/emoji'
import { scaleToFit } from '../domain/image/scale'
import { toSquare } from '../domain/image/square'
import { toAnsi } from '../domain/render/ansi'
import { toPng } from '../domain/render/png'
import { toSvg } from '../domain/render/svg'
import { findGrid } from '../storage/grids'
import { licenseHeaderMiddleware } from './middlewares/license'

const CACHE_CONTROL = 'public, max-age=3600'
const DEFAULT_PNG_SIZE = 512

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

const loadGrid = async (stem: string, square: boolean | undefined) => {
  const grid = await findGrid(stem)
  return grid === null || !square ? grid : toSquare(grid)
}

export const emojiRoutes = new Hono<AppEnv>()
  .use(licenseHeaderMiddleware)
  .get('/:emoji', sValidator('param', ParamSchema), sValidator('query', QuerySchema), async (c) => {
    const { emoji: stem } = c.req.valid('param')
    const { size, square } = c.req.valid('query')
    const grid = await loadGrid(stem, square)
    if (grid === null) return c.text('emoji not found', 404)

    const userAgent = c.req.header('user-agent')
    const isCurl = userAgent?.startsWith('curl/') ?? false

    if (isCurl) {
      const ansi = toAnsi(scaleToFit(grid, size))
      return c.text(ansi, 200, { 'cache-control': CACHE_CONTROL, vary: 'user-agent' })
    }

    const pngSize = size ?? DEFAULT_PNG_SIZE
    const png = await toPng(grid, { size: pngSize })
    return c.body(png, 200, {
      'content-type': 'image/png',
      'cache-control': CACHE_CONTROL,
      vary: 'user-agent',
    })
  })
  .get(
    '/:emoji/json',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const { size, square } = c.req.valid('query')
      const grid = await loadGrid(stem, square)
      if (grid === null) return c.text('emoji not found', 404)

      const scaled = scaleToFit(grid, size)

      return c.json(scaled, 200, { 'cache-control': CACHE_CONTROL })
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

      const pngSize = size ?? DEFAULT_PNG_SIZE
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
