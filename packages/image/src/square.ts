import type { DotGrid, Rgba } from './dot-grid'
import { dimensionsOf } from './scale'

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 }

export const toSquare = (pixels: DotGrid) => {
  const { width, height } = dimensionsOf(pixels)
  if (width === 0 || height === 0) return pixels

  const side = Math.max(width, height)
  const left = Math.floor((side - width) / 2)
  const top = Math.floor((side - height) / 2)

  return [...Array(side)].map((_, y) => {
    const sourceY = y - top
    const row = sourceY >= 0 && sourceY < height ? (pixels.at(sourceY) ?? []) : []

    return [...Array(side)].map((_, x) => {
      const sourceX = x - left
      return sourceX >= 0 ? (row.at(sourceX) ?? TRANSPARENT) : TRANSPARENT
    })
  })
}
