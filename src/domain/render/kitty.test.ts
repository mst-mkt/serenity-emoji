import { describe, expect, it } from 'vite-plus/test'

import { base64 } from '../../lib/base64'
import { toKitty } from './kitty'

describe('toKitty', () => {
  it('sends a small image in a single transmit-and-display chunk', () => {
    const png = Uint8Array.from([1, 2, 3])

    const kitty = toKitty(png)

    expect(kitty).toBe(`\x1b_Ga=T,f=100,m=0;${base64(png)}\x1b\\`)
  })

  it('splits a large image into 4096-byte chunks with continuation markers', () => {
    const kitty = toKitty(new Uint8Array(4000))
    const apcs = kitty.split('\x1b\\').filter((part) => part.length > 0)

    expect(apcs.length).toBe(2)
    expect(apcs[0]?.startsWith('\x1b_Ga=T,f=100,m=1;')).toBe(true)
    expect(apcs[1]?.startsWith('\x1b_Gm=0;')).toBe(true)
    expect(apcs[0]?.slice(apcs[0].indexOf(';') + 1).length).toBe(4096)
  })
})
