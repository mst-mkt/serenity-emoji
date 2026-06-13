import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { toSquare } from './square'

const CLEAR = rgba(0, 0, 0, 0)

describe('toSquare', () => {
  it('leaves an already square grid unchanged', () => {
    const a = rgba(1, 0, 0)
    const b = rgba(0, 1, 0)
    const grid = [
      [a, b],
      [b, a],
    ]

    const squared = toSquare(grid)

    expect(squared).toEqual(grid)
  })

  it('pads the sides of a tall grid to centre it horizontally', () => {
    const p = rgba(255, 0, 0)
    const grid = [[p], [p], [p]]

    const squared = toSquare(grid)

    expect(squared).toEqual([
      [CLEAR, p, CLEAR],
      [CLEAR, p, CLEAR],
      [CLEAR, p, CLEAR],
    ])
  })

  it('pads the top and bottom of a wide grid to centre it vertically', () => {
    const p = rgba(255, 0, 0)
    const grid = [[p, p, p]]

    const squared = toSquare(grid)

    expect(squared).toEqual([
      [CLEAR, CLEAR, CLEAR],
      [p, p, p],
      [CLEAR, CLEAR, CLEAR],
    ])
  })

  it('fills the gaps of a ragged grid with transparent pixels', () => {
    const a = rgba(1, 0, 0)
    const b = rgba(0, 1, 0)
    const grid = [[a, b], [a]]

    const squared = toSquare(grid)

    expect(squared).toEqual([
      [a, b],
      [a, CLEAR],
    ])
  })

  it('returns an empty grid as is', () => {
    const grids = [[], [[], []]]

    const results = grids.map((grid) => toSquare(grid))

    expect(results.at(0)).toEqual([])
    expect(results.at(1)).toEqual([[], []])
  })
})
