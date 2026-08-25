import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../test/fixtures'
import { toIco } from './ico'
import { toPng } from './png'

describe('toIco', () => {
  it('wraps a png in a single-entry icon directory', async () => {
    const png = await toPng([
      [rgba(255, 0, 0), rgba(0, 255, 0)],
      [rgba(0, 0, 255), rgba(255, 255, 0)],
    ])

    const ico = toIco(png)

    expect(Array.from(ico.slice(0, 6))).toEqual([0, 0, 1, 0, 1, 0])
    expect(ico[6]).toBe(2)
    expect(ico[7]).toBe(2)
    expect(Array.from(ico.slice(8, 14))).toEqual([0, 0, 1, 0, 32, 0])
    expect(Array.from(ico.slice(18, 22))).toEqual([22, 0, 0, 0])
    expect(Array.from(ico.slice(22))).toEqual([...png])
  })

  it('records the byte length of the embedded png', async () => {
    const png = await toPng([[rgba(255, 0, 0)]])

    const ico = toIco(png)
    const bytesInRes = ico[14] | (ico[15] << 8) | (ico[16] << 16) | (ico[17] << 24)

    expect(bytesInRes).toBe(png.length)
  })

  it('marks dimensions of 256 or more with a zero byte', async () => {
    const png = await toPng([[rgba(255, 0, 0)]], { size: 256 })

    const ico = toIco(png)

    expect(ico[6]).toBe(0)
    expect(ico[7]).toBe(0)
  })
})
