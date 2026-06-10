import { describe, expect, it } from 'vite-plus/test'

import { concat, crc32 } from './bytes.ts'

describe('concat', () => {
  it('merges buffers in order', () => {
    const parts = [Uint8Array.from([1, 2]), Uint8Array.from([]), Uint8Array.from([3])]

    const merged = concat(parts)

    expect([...merged]).toEqual([1, 2, 3])
  })

  it('returns an empty buffer for no parts', () => {
    const merged = concat([])

    expect(merged.length).toBe(0)
  })
})

describe('crc32', () => {
  it('matches the standard check value', () => {
    const input = new TextEncoder().encode('123456789')

    const checksum = crc32(input)

    expect(checksum).toBe(0xcbf43926)
  })

  it('returns 0 for empty input', () => {
    const checksum = crc32(new Uint8Array(0))

    expect(checksum).toBe(0)
  })
})
