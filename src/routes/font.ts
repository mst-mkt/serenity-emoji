import { Hono } from 'hono'

import type { AppEnv } from '../bindings'
import { parseFontFile } from '../storage/font-file'
import { FONT_CONTENT_TYPES, getFont, IMMUTABLE_CACHE, LATEST_CACHE } from '../storage/fonts'

export const fontRoutes = new Hono<AppEnv>().get('/font/:file', async (c) => {
  const file = c.req.param('file')
  const parsed = parseFontFile(file)
  if (parsed === null) return c.text('font not found', 404)

  const object = await getFont(file)
  if (object === null) return c.text('font not found', 404)

  const cacheControl = parsed.digest === null ? LATEST_CACHE : IMMUTABLE_CACHE

  return c.body(object.body, 200, {
    'content-type': FONT_CONTENT_TYPES[parsed.format],
    'cache-control': cacheControl,
    etag: object.httpEtag,
  })
})
