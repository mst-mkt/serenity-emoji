import { toStem } from '@serenity-emoji/emoji'
import emojiNameMap from 'emoji-name-map'

const MAX_CODE_POINT = 0x10ffff
const HEX_DIGITS = '0123456789ABCDEF'

const isStemInput = (input: string) => input.toUpperCase().startsWith('U+')

const isShortcodeInput = (input: string) => {
  return input.length > 2 && input.startsWith(':') && input.endsWith(':')
}

const isHex = (text: string) => {
  return text.length > 0 && text.split('').every((char) => HEX_DIGITS.includes(char))
}

const isValidUnit = (unit: string) => {
  if (!unit.startsWith('U+') || !isHex(unit.slice(2))) return false
  return Number.parseInt(unit.slice(2), 16) <= MAX_CODE_POINT
}

const resolveStemInput = (input: string) => {
  const stem = input.toUpperCase()
  const isValid = stem.split('_').every(isValidUnit)
  return isValid ? { stem } : { error: `invalid stem: ${input}` }
}

const resolveShortcode = (input: string) => {
  const emoji = emojiNameMap.get(input)
  if (typeof emoji !== 'string') return { error: `unknown shortcode: ${input}` }
  return { stem: toStem(emoji) }
}

export const resolveStem = (input: string) => {
  if (isStemInput(input)) return resolveStemInput(input)
  if (isShortcodeInput(input)) return resolveShortcode(input)

  return { stem: toStem(input) }
}
