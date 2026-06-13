import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { toAnsi } from './ansi'

const CLEAR = rgba(0, 0, 0, 0)

describe('toAnsi', () => {
  it('renders ▀ with top as fg and bottom as bg', () => {
    const grid = [[rgba(255, 0, 0)], [rgba(0, 255, 0)]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[48;2;0;255;0m\x1b[38;2;255;0;0m▀\x1b[0m\n')
  })

  it('renders ▀ with default bg when only top is set', () => {
    const grid = [[rgba(255, 0, 0)], [CLEAR]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[49m\x1b[38;2;255;0;0m▀\x1b[0m\n')
  })

  it('renders ▄ with default bg when only bottom is set', () => {
    const grid = [[CLEAR], [rgba(0, 0, 255)]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[49m\x1b[38;2;0;0;255m▄\x1b[0m\n')
  })

  it('renders a space when both are transparent', () => {
    const grid = [[CLEAR], [CLEAR]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[49m \x1b[0m\n')
  })

  it('treats pixels below the alpha threshold as transparent', () => {
    const grid = [[rgba(255, 212, 49, 63)], [rgba(255, 212, 49, 12)]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[49m \x1b[0m\n')
  })

  it('draws pixels at or above the alpha threshold', () => {
    const grid = [[rgba(255, 0, 0, 64)], [rgba(0, 0, 255, 224)]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[48;2;0;0;255m\x1b[38;2;255;0;0m▀\x1b[0m\n')
  })

  it('treats the missing bottom of an odd height as transparent', () => {
    const grid = [[rgba(255, 255, 255)]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[49m\x1b[38;2;255;255;255m▀\x1b[0m\n')
  })

  it('does not leak bg color into the next cell', () => {
    const grid = [
      [rgba(255, 0, 0), CLEAR],
      [CLEAR, rgba(0, 0, 255)],
    ]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[49m\x1b[38;2;255;0;0m▀\x1b[38;2;0;0;255m▄\x1b[0m\n')
  })

  it('emits color codes only when they change along a row', () => {
    const red = rgba(255, 0, 0)
    const grid = [
      [red, red, red],
      [red, red, red],
    ]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[48;2;255;0;0m\x1b[38;2;255;0;0m▀▀▀\x1b[0m\n')
  })

  it('restores the default bg after a colored run', () => {
    const red = rgba(255, 0, 0)
    const grid = [
      [red, CLEAR],
      [red, CLEAR],
    ]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[48;2;255;0;0m\x1b[38;2;255;0;0m▀\x1b[49m \x1b[0m\n')
  })

  it('pads the narrower row of a cell pair with transparent pixels', () => {
    const grid = [[rgba(255, 0, 0)], []]

    const ansi = toAnsi(grid)

    expect(ansi).toBe('\x1b[49m\x1b[38;2;255;0;0m▀\x1b[0m\n')
  })

  it('joins one cell row per two pixel rows with newlines', () => {
    const grid = [[rgba(255, 0, 0)], [rgba(255, 0, 0)], [rgba(0, 255, 0)], [rgba(0, 255, 0)]]

    const ansi = toAnsi(grid)

    expect(ansi).toBe(
      '\x1b[48;2;255;0;0m\x1b[38;2;255;0;0m▀\x1b[0m\n\x1b[48;2;0;255;0m\x1b[38;2;0;255;0m▀\x1b[0m\n',
    )
  })

  it('returns an empty string for empty grids', () => {
    const grids = [[], [[], []]]

    const results = grids.map(toAnsi)

    expect(results).toEqual(['', ''])
  })
})
