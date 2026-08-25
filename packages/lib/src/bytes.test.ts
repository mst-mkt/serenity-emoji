import { describe, expect, it } from 'vite-plus/test'

import { concat, crc32, hex, i8, i16, toHex, u8, u16, u32 } from './bytes'

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

describe('u8', () => {
  it('encodes a single byte', () => {
    const bytes = u8(0x12)

    expect([...bytes]).toEqual([0x12])
  })

  it('rejects values out of range', () => {
    expect(() => u8(0x100)).toThrow('u8 out of range: 256')
    expect(() => u8(-1)).toThrow('u8 out of range: -1')
  })
})

describe('i8', () => {
  it('encodes negative values as two’s complement', () => {
    const bytes = i8(-1)

    expect([...bytes]).toEqual([0xff])
  })

  it('rejects values out of range', () => {
    expect(() => i8(0x80)).toThrow('i8 out of range: 128')
  })
})

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

describe('hex', () => {
  it('pads single bytes to two digits', () => {
    expect(hex(0x0a)).toBe('0a')
    expect(hex(0xff)).toBe('ff')
  })
})

describe('toHex', () => {
  it('joins each byte as two digits', () => {
    const bytes = Uint8Array.from([0x00, 0x0a, 0xff])

    expect(toHex(bytes)).toBe('000aff')
  })
})
