import { sValidator } from '@hono/standard-validator'
import { toFontFaceCss } from '@serenity-emoji/font/webfont/css'
import { type FontFile, parseFontFile } from '@serenity-emoji/font/webfont/file-name'
import { ManifestSchema } from '@serenity-emoji/font/webfont/subsets'
import { Hono } from 'hono'
import * as v from 'valibot'

import type { AppEnv } from '../bindings'
import { buildRangeFont, buildTextFont } from '../fonts/build-fonts'
import {
  FONT_CONTENT_TYPES,
  getFont,
  getFontManifest,
  IMMUTABLE_CACHE,
  LATEST_CACHE,
} from '../storage/fonts'
import { licenseHeaderMiddleware } from './middlewares/license'

const fontFileQuerySchema = v.object({
  text: v.optional(v.string()),
})

const fontHeaders = (parsed: FontFile, cacheControl: string, etag?: string) => ({
  'content-type': FONT_CONTENT_TYPES[parsed.format],
  'cache-control': cacheControl,
  ...(etag === undefined ? {} : { etag }),
})

export const fontRoutes = new Hono<AppEnv>()
  .use(licenseHeaderMiddleware)
  .get('/serenity-emoji.css', async (c) => {
    const raw = await getFontManifest()
    if (raw === null) return c.text('font manifest not found', 404)

    const manifest = v.parse(ManifestSchema, JSON.parse(raw))
    const css = toFontFaceCss(manifest, new URL(c.req.url).origin)

    return c.body(css, 200, {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': LATEST_CACHE,
    })
  })
  .get('/font/:file', sValidator('query', fontFileQuerySchema), async (c) => {
    const file = c.req.param('file')
    const parsed = parseFontFile(file)
    if (parsed === null) return c.text('font not found', 404)

    const { text } = c.req.valid('query')
    if (parsed.subset === 'text' && text !== undefined) {
      const built = await buildTextFont(text, parsed.format)
      if (built === null) return c.text('font not found', 404)
      return c.body(built.body, 200, fontHeaders(parsed, LATEST_CACHE, built.etag))
    }

    const object = await getFont(file)
    if (object !== null) {
      const cacheControl = parsed.digest === null ? LATEST_CACHE : IMMUTABLE_CACHE
      return c.body(object.body, 200, fontHeaders(parsed, cacheControl, object.httpEtag))
    }

    // cache miss: build a contiguous range on demand, then serve the fresh bytes
    const built = await buildRangeFont(parsed)
    if (built === null) return c.text('font not found', 404)

    return c.body(built, 200, fontHeaders(parsed, LATEST_CACHE))
  })
