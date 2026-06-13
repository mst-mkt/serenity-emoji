import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { decodePng } from './decode/decode'
import { toPng } from './png'

const CLEAR = rgba(0, 0, 0, 0)

describe('toPng', () => {
  it('round-trips a grid through decodePng', async () => {
    const grid = [
      [rgba(255, 0, 0), rgba(0, 255, 0)],
      [rgba(0, 0, 255), rgba(255, 212, 49)],
    ]

    const decoded = await decodePng(await toPng(grid))

    expect(decoded).toEqual(grid)
  })

  it('preserves alpha values losslessly', async () => {
    const grid = [[rgba(255, 0, 0, 128), CLEAR, rgba(0, 0, 255, 1)]]

    const decoded = await decodePng(await toPng(grid))

    expect(decoded).toEqual(grid)
  })

  it('pads short rows of a ragged grid with transparent pixels', async () => {
    const red = rgba(255, 0, 0)
    const grid = [[red, red], [red]]

    const decoded = await decodePng(await toPng(grid))

    expect(decoded).toEqual([
      [red, red],
      [red, CLEAR],
    ])
  })

  it('scales the output when a size is given', async () => {
    const red = rgba(255, 0, 0)
    const grid = [[red]]

    const decoded = await decodePng(await toPng(grid, { size: 3 }))

    expect(decoded).toEqual([
      [red, red, red],
      [red, red, red],
      [red, red, red],
    ])
  })

  it('keeps aspect ratio when scaling', async () => {
    const red = rgba(255, 0, 0)
    const blue = rgba(0, 0, 255)
    const grid = [[red], [blue]]

    const decoded = await decodePng(await toPng(grid, { size: 4 }))

    expect(decoded).toEqual([
      [red, red],
      [red, red],
      [blue, blue],
      [blue, blue],
    ])
  })

  it('throws on an empty grid', async () => {
    const grids = [[], [[], []]]

    const results = grids.map((grid) => toPng(grid))

    await expect(results.at(0)).rejects.toThrow('cannot render an empty grid')
    await expect(results.at(1)).rejects.toThrow('cannot render an empty grid')
  })

  it('throws on an invalid size', async () => {
    const grid = [[rgba(255, 0, 0)]]

    await expect(toPng(grid, { size: 0 })).rejects.toThrow('invalid size: 0')
  })
})
