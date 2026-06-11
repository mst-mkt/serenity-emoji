import type { DotGrid, Rgba } from '../../dot-grid'

// size scales the longer side, keeping aspect ratio
export type SizeOptions = { size?: number }

const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 }

export const dimensionsOf = (pixels: DotGrid) => ({
  width: pixels.reduce((widest, row) => Math.max(widest, row.length), 0),
  height: pixels.length,
})

// rounding may hit 0 on extreme aspect ratios, so clamp to 1
export const fitTo = ({ width, height }: { width: number; height: number }, size: number) => {
  if (!Number.isInteger(size) || size < 1) throw new Error(`invalid size: ${size}`)

  const longer = Math.max(width, height)
  return {
    width: Math.max(1, Math.round((width * size) / longer)),
    height: Math.max(1, Math.round((height * size) / longer)),
  }
}

// nearest-neighbor resample; missing pixels in ragged rows count as transparent
export const scaleToFit = (pixels: DotGrid, size?: number) => {
  if (size === undefined) return pixels

  const source = dimensionsOf(pixels)
  if (source.width === 0 || source.height === 0) return pixels

  const target = fitTo(source, size)
  return [...Array(target.height)].map((_, y) => {
    const row = pixels.at(Math.floor((y * source.height) / target.height)) ?? []
    return [...Array(target.width)].map(
      (_, x) => row.at(Math.floor((x * source.width) / target.width)) ?? TRANSPARENT,
    )
  })
}
