import { isDigit, isHexChar } from '../../lib/chars'
import { type FontFormat } from '../font/build'

export type FontFile = { subset: string; digest: string | null; format: FontFormat }

const isSubsetChar = (char: string) => (char >= 'a' && char <= 'z') || isDigit(char) || char === '-'
const isSubset = (value: string) => value.length > 0 && value.split('').every(isSubsetChar)
const isDigest = (value: string) => value.length === 16 && value.split('').every(isHexChar)
const isFormat = (value: string): value is FontFormat => value === 'ttf' || value === 'woff'

// serenity-emoji.<subset>[.<digest>].<format>; the subset segment is part of the key scheme
export const parseFontFile = (file: string) => {
  const parts = file.split('.')
  const [name, subset] = parts
  const extension = parts.at(-1)

  if (name !== 'serenity-emoji' || extension === undefined || !isFormat(extension)) return null
  if (subset === undefined || !isSubset(subset)) return null

  if (parts.length === 3) return { subset, digest: null, format: extension }
  if (parts.length !== 4) return null

  const digest = parts.at(2) ?? ''
  return isDigest(digest) ? { subset, digest, format: extension } : null
}
