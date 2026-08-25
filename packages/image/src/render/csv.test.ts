import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../test/fixtures'
import { toCsv } from './csv'

const RED = rgba(255, 0, 0)
const GREEN = rgba(0, 255, 0)
const BLUE = rgba(0, 0, 255)
const CLEAR = rgba(0, 0, 0, 0)

describe('toCsv', () => {
  it('joins hex cells with the separator and rows with newlines', () => {
    const grid = [
      [RED, GREEN],
      [BLUE, CLEAR],
    ]

    expect(toCsv(grid, 'hex', ',')).toBe('#ff0000ff,#00ff00ff\n#0000ffff,#00000000')
  })

  it('uses the given separator', () => {
    expect(toCsv([[RED, GREEN]], 'hex', ';')).toBe('#ff0000ff;#00ff00ff')
  })

  it('quotes cells that contain the separator', () => {
    expect(toCsv([[RED]], 'rgba', ',')).toBe('"rgba(255, 0, 0, 1)"')
  })

  it('leaves cells unquoted when the separator does not collide', () => {
    expect(toCsv([[RED]], 'rgba', '\t')).toBe('rgba(255, 0, 0, 1)')
  })
})
