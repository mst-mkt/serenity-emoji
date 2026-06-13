import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { scaleToFit } from './scale'

const CLEAR = rgba(0, 0, 0, 0)

describe('scaleToFit', () => {
  it('returns the grid as-is without a size', () => {
    const grid = [[rgba(255, 0, 0)]]

    const scaled = scaleToFit(grid)

    expect(scaled).toBe(grid)
  })

  it('upscales each dot into a block', () => {
    const red = rgba(255, 0, 0)
    const blue = rgba(0, 0, 255)
    const grid = [
      [red, blue],
      [blue, red],
    ]

    const scaled = scaleToFit(grid, 4)

    expect(scaled).toEqual([
      [red, red, blue, blue],
      [red, red, blue, blue],
      [blue, blue, red, red],
      [blue, blue, red, red],
    ])
  })

  it('scales the longer side to size, keeping aspect ratio', () => {
    const red = rgba(255, 0, 0)
    const blue = rgba(0, 0, 255)
    const grid = [[red], [blue]]

    const scaled = scaleToFit(grid, 4)

    expect(scaled).toEqual([
      [red, red],
      [red, red],
      [blue, blue],
      [blue, blue],
    ])
  })

  it('downscales by picking nearest source pixels', () => {
    const colors = [rgba(1, 0, 0), rgba(2, 0, 0), rgba(3, 0, 0), rgba(4, 0, 0)]
    const grid = [colors]

    const scaled = scaleToFit(grid, 2)

    expect(scaled).toEqual([[rgba(1, 0, 0), rgba(3, 0, 0)]])
  })

  it('pads short rows of a ragged grid with transparent pixels', () => {
    const red = rgba(255, 0, 0)
    const grid = [[red, red], [red]]

    const scaled = scaleToFit(grid, 2)

    expect(scaled).toEqual([
      [red, red],
      [red, CLEAR],
    ])
  })

  it('returns an empty grid as-is even with a size', () => {
    const grid: never[] = []

    const scaled = scaleToFit(grid, 4)

    expect(scaled).toBe(grid)
  })

  it('throws on a non-integer size', () => {
    const grid = [[rgba(255, 0, 0)]]

    expect(() => scaleToFit(grid, 1.5)).toThrow('invalid size: 1.5')
  })

  it('throws on a size below one', () => {
    const grid = [[rgba(255, 0, 0)]]

    expect(() => scaleToFit(grid, 0)).toThrow('invalid size: 0')
  })
})
