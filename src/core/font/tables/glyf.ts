import { concat } from '../../decode/bytes'
import type { Rect } from '../glyphs'
import { i16, pad4, prefixSums, u16, u32 } from '../write'

const ON_CURVE = 0x01
const X_SHORT = 0x02
const Y_SHORT = 0x04
const X_SAME = 0x10
const Y_SAME = 0x20

export type GlyphBounds = Rect | null

// clockwise in y-up coordinates, so non-zero winding fills the rect
const toPoints = ({ xMin, yMin, xMax, yMax }: Rect) => [
  { x: xMin, y: yMax },
  { x: xMax, y: yMax },
  { x: xMax, y: yMin },
  { x: xMin, y: yMin },
]

const isShort = (delta: number) => delta !== 0 && Math.abs(delta) < 256

const coordFlags = (delta: number, shortBit: number, sameBit: number) => {
  if (delta === 0) return sameBit
  if (!isShort(delta)) return 0

  // for short coordinates the same-bit doubles as the positive-sign bit
  const positiveBit = delta > 0 ? sameBit : 0
  return shortBit | positiveBit
}

// raw byte values, not a Uint8Array, to avoid an allocation per coordinate
const coordBytes = (delta: number) => {
  if (delta === 0) return []
  if (isShort(delta)) return [Math.abs(delta)]

  const wrapped = delta & 0xffff
  return [(wrapped >>> 8) & 255, wrapped & 255]
}

export const boundsOf = (rects: Rect[]) => {
  return rects.reduce(
    (box, rect) => {
      box.xMin = Math.min(box.xMin, rect.xMin)
      box.yMin = Math.min(box.yMin, rect.yMin)
      box.xMax = Math.max(box.xMax, rect.xMax)
      box.yMax = Math.max(box.yMax, rect.yMax)
      return box
    },
    {
      xMin: Number.POSITIVE_INFINITY,
      yMin: Number.POSITIVE_INFINITY,
      xMax: Number.NEGATIVE_INFINITY,
      yMax: Number.NEGATIVE_INFINITY,
    },
  )
}

const encodeGlyph = (rects: Rect[], box: Rect) => {
  const points = rects.flatMap(toPoints)

  const deltas = points.map((point, index) => {
    const previous = index === 0 ? { x: 0, y: 0 } : points[index - 1]
    return { dx: point.x - previous.x, dy: point.y - previous.y }
  })

  const flags = deltas.map(
    ({ dx, dy }) => ON_CURVE | coordFlags(dx, X_SHORT, X_SAME) | coordFlags(dy, Y_SHORT, Y_SAME),
  )

  return concat([
    i16(rects.length),
    i16(box.xMin),
    i16(box.yMin),
    i16(box.xMax),
    i16(box.yMax),
    concat(rects.map((_, index) => u16(index * 4 + 3))),
    u16(0),
    Uint8Array.from(flags),
    Uint8Array.from(deltas.flatMap(({ dx }) => coordBytes(dx))),
    Uint8Array.from(deltas.flatMap(({ dy }) => coordBytes(dy))),
  ])
}

// long-format loca; every glyph is padded so offsets stay 4-byte aligned
export const buildGlyf = (glyphs: { rects: Rect[] }[]) => {
  const bounds: GlyphBounds[] = glyphs.map(({ rects }) =>
    rects.length === 0 ? null : boundsOf(rects),
  )

  const encoded = glyphs.map(({ rects }, index) => {
    const box = bounds[index]
    return box === null ? new Uint8Array(0) : pad4(encodeGlyph(rects, box))
  })

  const offsets = prefixSums(encoded.map(({ length }) => length))

  return { glyf: concat(encoded), loca: concat(offsets.map(u32)), bounds }
}
