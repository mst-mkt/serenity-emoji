import type { DotGrid, Rgba } from '../dot-grid'

// a terminal color: an Rgba, or null for the terminal default
type Paint = Rgba | null

// fg is null for blank cells, where the foreground color does not matter
type Cell = { fg: Paint; bg: Paint; block: string }

// undefined means nothing was emitted yet, so the first cell never trusts the terminal state
type RowState = { fg: Paint | undefined; bg: Paint | undefined; codes: string[] }

const RESET = '\x1b[0m'
const DEFAULT_BG = '\x1b[49m'

// ANSI colors carry no alpha, so binarize: pixels below this opacity are not drawn
const ALPHA_THRESHOLD = 64

const visiblePixel = (pixel: Rgba | undefined) =>
  pixel !== undefined && pixel.a >= ALPHA_THRESHOLD ? pixel : null

const fg = ({ r, g, b }: Rgba) => `\x1b[38;2;${r};${g};${b}m`
const bg = ({ r, g, b }: Rgba) => `\x1b[48;2;${r};${g};${b}m`

// pack two pixels into one cell: '▀' when top is set, '▄' when only bottom
const toCell = (top: Rgba | null, bottom: Rgba | null) => {
  const color = top ?? bottom
  if (color === null) return { fg: null, bg: null, block: ' ' }

  const block = top !== null ? '▀' : '▄'
  const back = top !== null && bottom !== null ? bottom : null

  return { fg: color, bg: back, block }
}

// the wider of the two rows decides the cell-row width
const toCellRow = (top: Rgba[], bottom: Rgba[]) => {
  const width = Math.max(top.length, bottom.length)
  return [...Array(width)].map((_, x) =>
    toCell(visiblePixel(top.at(x)), visiblePixel(bottom.at(x))),
  )
}

const isColor = (paint: Paint | undefined): paint is Rgba => paint !== undefined && paint !== null

const isSamePaint = (state: Paint | undefined, next: Paint) =>
  state === next ||
  (isColor(state) &&
    isColor(next) &&
    state.r === next.r &&
    state.g === next.g &&
    state.b === next.b)

const bgCodeFor = (state: Paint | undefined, next: Paint) =>
  isSamePaint(state, next) ? '' : next === null ? DEFAULT_BG : bg(next)

const fgCodeFor = (state: Paint | undefined, next: Paint) =>
  next === null || isSamePaint(state, next) ? '' : fg(next)

// emit color codes only when they differ from the previous cell in the row
const renderRow = (cells: Cell[]) => {
  const { codes } = cells.reduce<RowState>(
    (state, next) => {
      state.codes.push(
        `${bgCodeFor(state.bg, next.bg)}${fgCodeFor(state.fg, next.fg)}${next.block}`,
      )
      return { fg: next.fg ?? state.fg, bg: next.bg, codes: state.codes }
    },
    { fg: undefined, bg: undefined, codes: [] },
  )

  return codes.join('') + RESET
}

export const toAnsi = (pixels: DotGrid) => {
  if (pixels.every((row) => row.length === 0)) return ''

  const cellGrid = [...Array(Math.ceil(pixels.length / 2))].map((_, y) =>
    toCellRow(pixels.at(y * 2) ?? [], pixels.at(y * 2 + 1) ?? []),
  )
  const lines = cellGrid.map(renderRow)

  return lines.join('\n') + '\n'
}
