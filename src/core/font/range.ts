import { isHexChar } from '../chars'

export type CodePointRange = { min: number; max: number }

const MAX_CODE_POINT = 0x10ffff

const isHex = (value: string) => value.length > 0 && value.split('').every(isHexChar)

const toBound = (value: string) => {
  if (!isHex(value)) return null

  const codePoint = Number.parseInt(value, 16)
  return codePoint <= MAX_CODE_POINT ? codePoint : null
}

const isBound = (bound: number | null): bound is number => bound !== null

// `1f600` -> a single point, `1f300-1f5ff` -> an inclusive span; hex only, lowercase
export const parseRange = (subset: string): CodePointRange | null => {
  const bounds = subset.split('-').map(toBound)
  if (!bounds.every(isBound)) return null

  if (bounds.length === 1) return { min: bounds[0], max: bounds[0] }
  if (bounds.length !== 2) return null

  const [min, max] = bounds
  return min <= max ? { min, max } : null
}
