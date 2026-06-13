import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { toSvg } from './svg'

const CLEAR = rgba(0, 0, 0, 0)

describe('toSvg', () => {
  it('renders a dot as a unit rect inside a sized svg', () => {
    const grid = [[rgba(255, 0, 0)]]

    const svg = toSvg(grid)

    expect(svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="1" height="1" shape-rendering="crispEdges">' +
        '<metadata>Copyright (c) the SerenityOS developers. BSD-2-Clause: ' +
        'https://github.com/SerenityOS/serenity/blob/master/LICENSE</metadata>' +
        '<rect x="0" y="0" width="1" height="1" fill="#ff0000"/></svg>',
    )
  })

  it('embeds the upstream license in a metadata element', () => {
    const grid = [[rgba(255, 0, 0)]]

    const svg = toSvg(grid)

    expect(svg).toContain('<metadata>Copyright (c) the SerenityOS developers. BSD-2-Clause:')
  })

  it('pads hex color channels to two digits', () => {
    const grid = [[rgba(0, 10, 15)]]

    const svg = toSvg(grid)

    expect(svg).toContain('fill="#000a0f"')
  })

  it('merges a horizontal run of identical pixels into one rect', () => {
    const red = rgba(255, 0, 0)
    const grid = [[red, red, rgba(0, 0, 255)]]

    const svg = toSvg(grid)

    expect(svg).toContain('<rect x="0" y="0" width="2" height="1" fill="#ff0000"/>')
    expect(svg).toContain('<rect x="2" y="0" width="1" height="1" fill="#0000ff"/>')
  })

  it('does not merge runs across transparent gaps', () => {
    const red = rgba(255, 0, 0)
    const grid = [[red, CLEAR, red]]

    const svg = toSvg(grid)

    expect(svg).toContain('<rect x="0" y="0" width="1" height="1" fill="#ff0000"/>')
    expect(svg).toContain('<rect x="2" y="0" width="1" height="1" fill="#ff0000"/>')
  })

  it('does not merge runs of different alpha', () => {
    const grid = [[rgba(255, 0, 0, 255), rgba(255, 0, 0, 128)]]

    const svg = toSvg(grid)

    expect(svg).toContain('<rect x="0" y="0" width="1" height="1" fill="#ff0000"/>')
    expect(svg).toContain(
      '<rect x="1" y="0" width="1" height="1" fill="#ff0000" fill-opacity="0.502"/>',
    )
  })

  it('draws nothing for fully transparent pixels', () => {
    const grid = [[CLEAR], [CLEAR]]

    const svg = toSvg(grid)

    expect(svg).not.toContain('<rect')
  })

  it('places each row at its y position', () => {
    const grid = [[rgba(255, 0, 0)], [rgba(0, 0, 255)]]

    const svg = toSvg(grid)

    expect(svg).toContain('<rect x="0" y="0"')
    expect(svg).toContain('<rect x="0" y="1"')
  })

  it('sets width and height from size, keeping the viewBox', () => {
    const red = rgba(255, 0, 0)
    const grid = [[red, red]]

    const svg = toSvg(grid, { size: 8 })

    expect(svg).toContain('viewBox="0 0 2 1" width="8" height="4"')
  })

  it('throws on an empty grid', () => {
    const grids = [[], [[], []]]

    const results = grids.map((grid) => () => toSvg(grid))

    expect(results.at(0)).toThrow('cannot render an empty grid')
    expect(results.at(1)).toThrow('cannot render an empty grid')
  })

  it('throws on an invalid size', () => {
    const grid = [[rgba(255, 0, 0)]]

    expect(() => toSvg(grid, { size: 1.5 })).toThrow('invalid size: 1.5')
  })
})
