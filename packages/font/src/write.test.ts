import { describe, expect, it } from 'vite-plus/test'

import { checksum, pad4, tag } from './write'

describe('tag', () => {
  it('encodes four ascii characters', () => {
    const bytes = tag('head')

    expect([...bytes]).toEqual([0x68, 0x65, 0x61, 0x64])
  })

  it('rejects other lengths', () => {
    expect(() => tag('he')).toThrow('tag must be 4 characters: he')
  })
})

describe('pad4', () => {
  it('pads to the next multiple of four', () => {
    const data = Uint8Array.from([1, 2, 3, 4, 5])

    const padded = pad4(data)

    expect([...padded]).toEqual([1, 2, 3, 4, 5, 0, 0, 0])
  })

  it('keeps aligned data unchanged', () => {
    const data = Uint8Array.from([1, 2, 3, 4])

    const padded = pad4(data)

    expect(padded).toBe(data)
  })
})

describe('checksum', () => {
  it('sums big-endian uint32 words', () => {
    const data = Uint8Array.from([0, 0, 0, 1, 1, 0, 0, 0])

    const sum = checksum(data)

    expect(sum).toBe(0x01000001)
  })

  it('treats trailing bytes as a zero-padded word', () => {
    const data = Uint8Array.from([0, 0, 0, 1, 0xff])

    const sum = checksum(data)

    expect(sum).toBe(0xff000001)
  })

  it('wraps modulo 2^32', () => {
    const data = Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0, 0, 0, 2])

    const sum = checksum(data)

    expect(sum).toBe(1)
  })
})
