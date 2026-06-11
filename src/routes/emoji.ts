import { sValidator } from '@hono/standard-validator'
import { Hono } from 'hono'
import * as v from 'valibot'

import type { AppEnv } from '../bindings'
import { toStem } from '../core/emoji'
import { toAnsi } from '../core/render/ansi'
import { toPng } from '../core/render/png'
import { toSvg } from '../core/render/svg'
import { scaleToFit } from '../core/render/utils/scale'
import { findGrid } from '../storage'

const CACHE_CONTROL = 'public, max-age=3600'

const ParamSchema = v.object({
  emoji: v.pipe(v.string(), v.transform(toStem)),
})

const QuerySchema = v.object({
  size: v.optional(
    v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1), v.maxValue(2048)),
  ),
})

export const emojiRoutes = new Hono<AppEnv>()
  .get('/:emoji', sValidator('param', ParamSchema), sValidator('query', QuerySchema), async (c) => {
    const { emoji: stem } = c.req.valid('param')
    const grid = await findGrid(c.env.KV, stem)
    if (grid === null) return c.text('emoji not found', 404)

    const { size } = c.req.valid('query')
    const userAgent = c.req.header('user-agent')
    const isCurl = userAgent?.startsWith('curl/') ?? false

    if (isCurl) {
      const ansi = toAnsi(scaleToFit(grid, size))
      return c.text(ansi, 200, { 'cache-control': CACHE_CONTROL, vary: 'user-agent' })
    }

    const png = await toPng(grid, { size })
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
      const grid = await findGrid(c.env.KV, stem)
      if (grid === null) return c.text('emoji not found', 404)

      const { size } = c.req.valid('query')
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
      const grid = await findGrid(c.env.KV, stem)
      if (grid === null) return c.text('emoji not found', 404)

      const { size } = c.req.valid('query')
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
      const grid = await findGrid(c.env.KV, stem)
      if (grid === null) return c.text('emoji not found', 404)

      const { size } = c.req.valid('query')
      const png = await toPng(grid, { size })

      return c.body(png, 200, { 'content-type': 'image/png', 'cache-control': CACHE_CONTROL })
    },
  )
  .get(
    '/:emoji/svg',
    sValidator('param', ParamSchema),
    sValidator('query', QuerySchema),
    async (c) => {
      const { emoji: stem } = c.req.valid('param')
      const grid = await findGrid(c.env.KV, stem)
      if (grid === null) return c.text('emoji not found', 404)

      const { size } = c.req.valid('query')
      const svg = toSvg(grid, { size })

      return c.body(svg, 200, { 'content-type': 'image/svg+xml', 'cache-control': CACHE_CONTROL })
    },
  )
