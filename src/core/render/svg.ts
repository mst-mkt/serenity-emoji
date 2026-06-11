import type { DotGrid, Rgba } from '../dot-grid'
import { dimensionsOf, fitTo, type SizeOptions } from './utils/scale'

// a horizontal run of identical pixels, drawn as one rect
type Run = { x: number; width: number; color: Rgba }

const hex = (value: number) => value.toString(16).padStart(2, '0')

const fill = (rgba: Rgba) => `#${hex(rgba.r)}${hex(rgba.g)}${hex(rgba.b)}`

const opacity = (rgba: Rgba) => {
  if (rgba.a === 255) return ''
  return ` fill-opacity="${Number((rgba.a / 255).toFixed(4))}"`
}

const isSameColor = (a: Rgba, b: Rgba) => {
  const isSame = [a.r === b.r, a.g === b.g, a.b === b.b, a.a === b.a]
  return isSame.every(Boolean)
}

const extendsRun = (run: Run | undefined, x: number, color: Rgba): run is Run => {
  return run !== undefined && run.x + run.width === x && isSameColor(run.color, color)
}

// alpha 0 pixels are not drawn
const toRuns = (row: Rgba[]) => {
  return row.reduce<Run[]>((runs, color, x) => {
    if (color.a === 0) return runs

    const last = runs.at(-1)
    if (extendsRun(last, x, color)) {
      last.width += 1
      return runs
    }

    runs.push({ x, width: 1, color })
    return runs
  }, [])
}

const toRect = ({ x, width, color }: Run, y: number) => {
  return `<rect x="${x}" y="${y}" width="${width}" height="1" fill="${fill(color)}"${opacity(color)}/>`
}

export const toSvg = (pixels: DotGrid, options: SizeOptions = {}) => {
  const { width, height } = dimensionsOf(pixels)
  if (width === 0 || height === 0) throw new Error('cannot render an empty grid')

  const fitted =
    options.size === undefined ? { width, height } : fitTo({ width, height }, options.size)
  const rects = pixels.flatMap((row, y) => toRuns(row).map((run) => toRect(run, y)))
  const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${fitted.width}" height="${fitted.height}" shape-rendering="crispEdges">`

  return `${open}${rects.join('')}</svg>`
}
