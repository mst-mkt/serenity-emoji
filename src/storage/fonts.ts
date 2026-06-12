import { env } from 'cloudflare:workers'

const LATEST_KEY = 'font/serenity-emoji.full.ttf'
const keyOf = (digest: string) => `font/serenity-emoji.full.${digest}.ttf`
const fileKeyOf = (file: string) => `font/${file}`

export const FONT_CONTENT_TYPE = 'font/ttf'
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable'
export const LATEST_CACHE = 'public, max-age=86400'

export const getFont = (file: string) => env.R2.get(fileKeyOf(file))

export const putFont = (ttf: Uint8Array, digest: string) => {
  return Promise.all([
    env.R2.put(keyOf(digest), ttf, {
      httpMetadata: { contentType: FONT_CONTENT_TYPE, cacheControl: IMMUTABLE_CACHE },
    }),
    env.R2.put(LATEST_KEY, ttf, {
      httpMetadata: { contentType: FONT_CONTENT_TYPE, cacheControl: LATEST_CACHE },
      customMetadata: { digest },
    }),
  ])
}

// target is the snapshot digest the font should be built from, built the one it was built from;
// comparing them survives crashes and concurrent syncs, unlike a consumable dirty flag
const TARGET_KEY = 'font:target'
const BUILT_KEY = 'font:built'

export const getFontTarget = () => env.KV.get(TARGET_KEY)

export const putFontTarget = (digest: string) => env.KV.put(TARGET_KEY, digest)

export const getFontBuilt = () => env.KV.get(BUILT_KEY)

export const putFontBuilt = (digest: string) => env.KV.put(BUILT_KEY, digest)
