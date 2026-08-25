import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  ARTWORK_MAX_DIMENSION,
  toCodePoints,
  withoutVariationSelectors,
} from '@serenity-emoji/emoji'
import { decodePng } from '@serenity-emoji/image/decode'
import * as v from 'valibot'

import { fail, reasonOf } from '../../../libs/fail'

const API_BASE_URL = 'https://serenity.keito.dev'

const rgbaSchema = v.object({ r: v.number(), g: v.number(), b: v.number(), a: v.number() })
const gridSchema = v.array(v.array(rgbaSchema))

const toEmoji = (stem: string) => String.fromCodePoint(...toCodePoints(stem))

const fetchGrid = async (stem: string) => {
  const emoji = encodeURIComponent(toEmoji(stem))
  const url = `${API_BASE_URL}/${emoji}/json?format=object`

  const response = await fetch(url).catch((cause) => {
    return fail(`failed to reach the api: ${reasonOf(cause)}`)
  })
  if (response.status === 404) return null
  if (!response.ok) {
    return fail(`api request failed: ${response.status} ${response.statusText}`)
  }

  return v.parse(gridSchema, await response.json())
}

const readGridFile = async (emojiDir: string, stem: string) => {
  const bytes = await readFile(join(emojiDir, `${stem}.png`)).catch(() => null)
  return bytes === null ? null : decodePng(bytes, { maxDimension: ARTWORK_MAX_DIMENSION })
}

const readGrid = async (emojiDir: string, stem: string) => {
  const exact = await readGridFile(emojiDir, stem)
  if (exact !== null) return exact

  const bare = withoutVariationSelectors(stem)
  return bare === stem ? null : readGridFile(emojiDir, bare)
}

export const loadGrid = (stem: string, emojiDir: string | undefined) => {
  return emojiDir === undefined ? fetchGrid(stem) : readGrid(emojiDir, stem)
}
