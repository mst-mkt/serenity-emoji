export type FontFile = { subset: string; digest: string | null }

const isDigit = (char: string) => char >= '0' && char <= '9'
const isSubsetChar = (char: string) => (char >= 'a' && char <= 'z') || isDigit(char) || char === '-'
const isSubset = (value: string) => value.length > 0 && value.split('').every(isSubsetChar)
const isHexChar = (char: string) => isDigit(char) || (char >= 'a' && char <= 'f')
const isDigest = (value: string) => value.length === 16 && value.split('').every(isHexChar)

// serenity-emoji.<subset>[.<digest>].ttf; the subset segment is part of the key scheme
export const parseFontFile = (file: string) => {
  const parts = file.split('.')
  const [name, subset] = parts
  const extension = parts.at(-1)

  if (name !== 'serenity-emoji' || extension !== 'ttf') return null
  if (subset === undefined || !isSubset(subset)) return null

  if (parts.length === 3) return { subset, digest: null }
  if (parts.length !== 4) return null

  const digest = parts.at(2) ?? ''
  return isDigest(digest) ? { subset, digest } : null
}
