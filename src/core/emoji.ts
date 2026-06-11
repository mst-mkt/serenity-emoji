const toUnit = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase()}`

export const toStem = (emoji: string) => {
  const emojiChars = Array.from(emoji, (char) => toUnit(char.codePointAt(0) ?? 0))
  const stem = emojiChars.join('_')
  return stem
}

const isPrivateUse = (codePoint: number) => {
  const ranges = [
    [0xe000, 0xf8ff],
    [0xf0000, 0xffffd],
    [0x100000, 0x10fffd],
  ]

  return ranges.some(([min, max]) => codePoint >= min && codePoint <= max)
}

export const hasPrivateUse = (stem: string) => {
  const codePoints = stem.split('_').map((unit) => Number.parseInt(unit.slice(2), 16))
  return codePoints.some(isPrivateUse)
}

const VARIATION_SELECTOR = 'U+FE0F'

export const withoutVariationSelectors = (stem: string) => {
  const withoutVariationSelectors = stem
    .split('_')
    .filter((unit) => unit !== VARIATION_SELECTOR)
    .join('_')

  return withoutVariationSelectors
}
