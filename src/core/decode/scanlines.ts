import { inflate } from '../zlib'

type LineMeta = { width: number; height: number; depth: number; channels: number }

const EMPTY = new Uint8Array(0)

type Predictor = (left: number, up: number, upLeft: number) => number

// Paeth predictor: pick the neighbor closest to left + up - upLeft (ties favor left, then up)
const paeth = (left: number, up: number, upLeft: number) => {
  const estimate = left + up - upLeft
  const toLeft = Math.abs(estimate - left)
  const toUp = Math.abs(estimate - up)
  const toUpLeft = Math.abs(estimate - upLeft)

  return toLeft <= toUp && toLeft <= toUpLeft ? left : toUp <= toUpLeft ? up : upLeft
}

// predictors by filter type (0: None, 1: Sub, 2: Up, 3: Average, 4: Paeth)
const PREDICTORS = {
  0: () => 0,
  1: (left) => left,
  2: (_, up) => up,
  3: (left, up) => Math.floor((left + up) / 2),
  4: paeth,
} as const satisfies Record<number, Predictor>

const isFilterType = (n: number): n is keyof typeof PREDICTORS => n in PREDICTORS

// unfilter one scanline (each byte depends on the previous, so mutate the local buffer)
const unfilter = (raw: Uint8Array, prior: Uint8Array, bpp: number) => {
  const filter = raw.at(0) ?? 0
  if (!isFilterType(filter)) throw new Error(`invalid png: unknown filter type ${filter}`)
  const predict = PREDICTORS[filter]
  const line = new Uint8Array(raw.length - 1)

  for (let i = 0; i < line.length; i++) {
    const left = i >= bpp ? (line.at(i - bpp) ?? 0) : 0
    const up = prior.at(i) ?? 0
    const upLeft = i >= bpp ? (prior.at(i - bpp) ?? 0) : 0
    line[i] = ((raw.at(i + 1) ?? 0) + predict(left, up, upLeft)) & 255
  }

  return line
}

// inflate IDAT and unfilter it into rows of bytes
export const toScanlines = async (idat: Uint8Array<ArrayBuffer>, meta: LineMeta) => {
  const { width, height, depth, channels } = meta

  const bytesPerRow = Math.ceil((width * channels * depth) / 8)
  // filters step in whole bytes, at least 1 even at sub-byte depths
  const bpp = Math.max(1, Math.ceil((channels * depth) / 8))
  // each scanline is prefixed by one filter-type byte
  const stride = bytesPerRow + 1

  const inflated = await inflate(idat, height * stride)

  if (inflated.length < height * stride) throw new Error('invalid png: truncated image data')

  const emptyRows = [...Array(height)]
  const scanlines = emptyRows.reduce<Uint8Array[]>((acc, _, y) => {
    const raw = inflated.subarray(y * stride, (y + 1) * stride)
    acc.push(unfilter(raw, acc.at(-1) ?? EMPTY, bpp))
    return acc
  }, [])

  return scanlines
}
