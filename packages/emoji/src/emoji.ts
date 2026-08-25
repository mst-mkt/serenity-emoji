export const toUnit = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase()}`

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

export const toCodePoints = (stem: string) => {
  return stem.split('_').map((unit) => Number.parseInt(unit.slice(2), 16))
}

export const hasPrivateUse = (stem: string) => {
  return toCodePoints(stem).some(isPrivateUse)
}

// upstream emoji artwork ships as `<stem>.png`; private use glyphs are excluded from the set
export const stemOfEmojiFile = (fileName: string) => {
  if (!fileName.startsWith('U+') || !fileName.endsWith('.png')) return null

  const stem = fileName.slice(0, -'.png'.length)
  return hasPrivateUse(stem) ? null : stem
}

export const VARIATION_SELECTOR = 0xfe0f
const VARIATION_SELECTOR_UNIT = toUnit(VARIATION_SELECTOR)

export const withoutVariationSelectors = (stem: string) => {
  const withoutVariationSelectors = stem
    .split('_')
    .filter((unit) => unit !== VARIATION_SELECTOR_UNIT)
    .join('_')

  return withoutVariationSelectors
}

export const textCodePoints = (text: string) => {
  const points = Array.from(text, (char) => char.codePointAt(0) ?? 0).filter(
    (codePoint) => codePoint !== VARIATION_SELECTOR,
  )

  return new Set(points)
}
