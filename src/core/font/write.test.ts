import { describe, expect, it } from 'vite-plus/test'

import { checksum, i16, pad4, tag, u16, u32 } from './write'

describe('u16', () => {
  it('encodes big-endian', () => {
    const bytes = u16(0x1234)

    expect([...bytes]).toEqual([0x12, 0x34])
  })

  it('rejects values out of range', () => {
    expect(() => u16(0x10000)).toThrow('u16 out of range: 65536')
    expect(() => u16(-1)).toThrow('u16 out of range: -1')
  })
})

describe('i16', () => {
  it('encodes negative values as two’s complement', () => {
    const bytes = i16(-1)

    expect([...bytes]).toEqual([0xff, 0xff])
  })

  it('rejects values out of range', () => {
    expect(() => i16(0x8000)).toThrow('i16 out of range: 32768')
  })
})

describe('u32', () => {
  it('encodes big-endian', () => {
    const bytes = u32(0x01020304)

    expect([...bytes]).toEqual([1, 2, 3, 4])
  })
})

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
