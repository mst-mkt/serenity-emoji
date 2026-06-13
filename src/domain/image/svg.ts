import { hex } from '../../lib/bytes'
import { svgMetadata } from '../attribution'
import { type DotGrid, type Rgba, type Run, toRuns } from '../dot-grid'
import { dimensionsOf, fitTo, type SizeOptions } from './scale'

const fill = (rgba: Rgba) => `#${hex(rgba.r)}${hex(rgba.g)}${hex(rgba.b)}`

const opacity = (rgba: Rgba) => {
  if (rgba.a === 255) return ''
  return ` fill-opacity="${Number((rgba.a / 255).toFixed(4))}"`
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

  return `${open}${svgMetadata()}${rects.join('')}</svg>`
}
