import { env } from 'cloudflare:workers'

import { sha256Hex } from '../core/digest'
import type { SubsetEntry } from '../core/font/subsets'
import type { FontFormat } from './font-file'

const latestKeyOf = (subset: string, format: FontFormat) =>
  `font/serenity-emoji.${subset}.${format}`
const keyOf = (subset: string, digest: string, format: FontFormat) =>
  `font/serenity-emoji.${subset}.${digest}.${format}`
const fileKeyOf = (file: string) => `font/${file}`

export const FONT_CONTENT_TYPES = {
  ttf: 'font/ttf',
  woff: 'font/woff',
} as const satisfies Record<FontFormat, string>

export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable'
export const LATEST_CACHE = 'public, max-age=86400'

export const getFont = (file: string) => env.R2.get(fileKeyOf(file))

export const putFont = async (font: Uint8Array, subset: string, format: FontFormat) => {
  const hex = await sha256Hex(font)
  const digest = hex.slice(0, 16)
  const contentType = FONT_CONTENT_TYPES[format]

  await Promise.all([
    env.R2.put(keyOf(subset, digest, format), font, {
      httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE },
    }),
    env.R2.put(latestKeyOf(subset, format), font, {
      httpMetadata: { contentType, cacheControl: LATEST_CACHE },
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

const MANIFEST_KEY = 'font:manifest'

export const getFontManifest = () => env.KV.get(MANIFEST_KEY)

export const putFontManifest = (manifest: SubsetEntry[]) => {
  return env.KV.put(MANIFEST_KEY, JSON.stringify(manifest))
}
