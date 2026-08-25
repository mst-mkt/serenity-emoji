import { type ColorFormat, formatColor } from '../color/format'
import type { DotGrid } from '../dot-grid'

// RFC 4180: quote a cell that holds the separator, a quote, or a newline
const cell = (value: string, separator: string) =>
  value.includes(separator) || value.includes('"') || value.includes('\n')
    ? `"${value.replaceAll('"', '""')}"`
    : value

export const toCsv = (pixels: DotGrid, format: ColorFormat, separator: string) =>
  pixels
    .map((row) =>
      row
        .map((color) => {
          const value = formatColor(color, format)
          return cell(typeof value === 'string' ? value : '', separator)
        })
        .join(separator),
    )
    .join('\n')
