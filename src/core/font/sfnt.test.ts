import { describe, expect, it } from 'vite-plus/test'

import { tagAt, u16At, u32At } from '../fixtures'
import { toSfnt } from './sfnt'
import { checksum } from './write'

describe('toSfnt', () => {
  it('sorts directory records by tag and aligns table offsets', () => {
    const tables = [
      { tag: 'zzzz', data: Uint8Array.from([1, 2, 3]) },
      { tag: 'aaaa', data: Uint8Array.from([4, 5, 6, 7, 8]) },
    ]

    const font = toSfnt(tables)

    expect(u32At(font, 0)).toBe(0x00010000)
    expect(u16At(font, 4)).toBe(2)
    expect(tagAt(font, 12)).toBe('aaaa')
    expect(tagAt(font, 28)).toBe('zzzz')
    expect(u32At(font, 20)).toBe(44)
    expect(u32At(font, 24)).toBe(5)
    expect(u32At(font, 36)).toBe(52)
    expect(u32At(font, 40)).toBe(3)
  })

  it('patches head so the whole font checksums to the magic constant', () => {
    const tables = [
      { tag: 'head', data: new Uint8Array(54) },
      { tag: 'glyf', data: Uint8Array.from([1, 2, 3, 4]) },
    ]

    const font = toSfnt(tables)

    expect(checksum(font)).toBe(0xb1b0afba)
  })
})
