import { describe, expect, it } from 'vite-plus/test'

import { inflate, tagAt, u16At, u32At } from '../../test/fixtures'
import { assembleSfnt, toSfnt } from './sfnt'
import { toWoff } from './woff'
import { checksum } from './write'

const entryAt = (woff: Uint8Array, index: number) => {
  const at = 44 + index * 20

  return {
    tag: tagAt(woff, at),
    offset: u32At(woff, at + 4),
    compLength: u32At(woff, at + 8),
    origLength: u32At(woff, at + 12),
    origChecksum: u32At(woff, at + 16),
  }
}

const tables = () => {
  return [
    { tag: 'head', data: new Uint8Array(54) },
    { tag: 'glyf', data: Uint8Array.from([1, 2, 3, 4]) },
  ]
}

describe('toWoff', () => {
  it('writes the woff header around the original sfnt sizes', async () => {
    const sfnt = toSfnt(tables())

    const woff = await toWoff(assembleSfnt(tables()))

    expect(tagAt(woff, 0)).toBe('wOFF')
    expect(u32At(woff, 4)).toBe(0x00010000)
    expect(u32At(woff, 8)).toBe(woff.length)
    expect(u16At(woff, 12)).toBe(2)
    expect(u16At(woff, 14)).toBe(0)
    expect(u32At(woff, 16)).toBe(sfnt.length)
    expect(u32At(woff, 24)).toBe(0)
    expect(u32At(woff, 36)).toBe(0)
  })

  it('sorts directory entries by tag and aligns table offsets', async () => {
    const woff = await toWoff(assembleSfnt(tables()))

    const glyf = entryAt(woff, 0)
    const head = entryAt(woff, 1)
    expect(glyf.tag).toBe('glyf')
    expect(head.tag).toBe('head')
    expect(glyf.offset).toBe(84)
    expect(head.offset).toBe(88)
    expect(woff.length % 4).toBe(0)
  })

  it('stores incompressible tables raw', async () => {
    const woff = await toWoff(assembleSfnt(tables()))

    const glyf = entryAt(woff, 0)
    const stored = woff.subarray(glyf.offset, glyf.offset + glyf.compLength)
    expect(glyf.compLength).toBe(4)
    expect(glyf.origLength).toBe(4)
    expect(stored).toEqual(Uint8Array.from([1, 2, 3, 4]))
  })

  it('compresses tables that shrink and round-trips them to the sfnt bytes', async () => {
    const sfnt = toSfnt(tables())

    const woff = await toWoff(assembleSfnt(tables()))

    const head = entryAt(woff, 1)
    const stored = woff.subarray(head.offset, head.offset + head.compLength)
    const original = await inflate(stored)
    expect(head.compLength).toBeLessThan(head.origLength)
    expect(head.origLength).toBe(54)
    expect(original).toEqual(sfnt.subarray(48, 48 + 54))
  })

  it('keeps the zero-adjustment head checksum while storing the patched bytes', async () => {
    const woff = await toWoff(assembleSfnt(tables()))

    const head = entryAt(woff, 1)
    const stored = woff.subarray(head.offset, head.offset + head.compLength)
    const original = await inflate(stored)
    expect(head.origChecksum).toBe(checksum(new Uint8Array(54)))
    expect(u32At(original, 8)).not.toBe(0)
  })
})
