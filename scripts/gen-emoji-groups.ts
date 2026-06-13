// Generates src/domain/webfont/groups.gen.ts
// - the codepoint -> Unicode emoji group table
// - used to split fonts into per-group subsets
//
// usage: node scripts/gen-emoji-groups.ts (fetches the latest emoji-test.txt)

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { format } from 'vite-plus/fmt'

import { parseEmojiGroups, parseEmojiVersion } from './internal/emoji-test.ts'
import { renderEmojiGroups } from './internal/render.ts'

const SOURCE = 'https://unicode.org/Public/emoji/latest/emoji-test.txt'
const OUTPUT = join(import.meta.dirname, '../src/domain/webfont/groups.gen.ts')

const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`fetch ${SOURCE} failed: ${response.status}`)

const text = await response.text()
const groups = parseEmojiGroups(text)
const source = renderEmojiGroups(groups, parseEmojiVersion(text))

const { code } = await format(OUTPUT, source, { singleQuote: true, semi: false })
writeFileSync(OUTPUT, code)

console.log(`wrote ${groups.size} codepoints to ${OUTPUT}`)
