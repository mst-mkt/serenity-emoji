import { Hono } from 'hono'
import * as v from 'valibot'

import type { AppEnv } from '../bindings'
import { toFontFaceCss } from '../core/font/css'
import { ManifestSchema } from '../core/font/subsets'
import { parseFontFile } from '../storage/font-file'
import {
  FONT_CONTENT_TYPES,
  getFont,
  getFontManifest,
  IMMUTABLE_CACHE,
  LATEST_CACHE,
} from '../storage/fonts'

export const fontRoutes = new Hono<AppEnv>()
  .get('/serenity-emoji.css', async (c) => {
    const raw = await getFontManifest()
    if (raw === null) return c.text('font manifest not found', 404)

    const manifest = v.parse(ManifestSchema, JSON.parse(raw))
    const css = toFontFaceCss(manifest)

    return c.body(css, 200, {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': LATEST_CACHE,
    })
  })
  .get('/font/:file', async (c) => {
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
