import { describe, expect, it } from 'vite-plus/test'

import { parseRange } from './range'

describe('parseRange', () => {
  it('parses a single codepoint', () => {
    expect(parseRange('1f600')).toEqual({ min: 0x1f600, max: 0x1f600 })
  })

  it('parses an inclusive span', () => {
    expect(parseRange('1f300-1f5ff')).toEqual({ min: 0x1f300, max: 0x1f5ff })
  })

  it('rejects non-hex, reversed, oversized, and malformed spans', () => {
    const cases = [
      '',
      'smileys-emotion',
      'full',
      '1f5ff-1f300',
      '110000',
      '1f300-1f400-1f500',
      '-1f300',
    ]

    expect(cases.map(parseRange)).toEqual(cases.map(() => null))
  })
})
