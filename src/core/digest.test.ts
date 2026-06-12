import { describe, expect, it } from 'vite-plus/test'

import { sha256Hex } from './digest'

describe('sha256Hex', () => {
  it('hashes empty input to the known vector', async () => {
    const bytes = new Uint8Array(0)

    const hex = await sha256Hex(bytes)

    expect(hex).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('pads bytes below 0x10 with a leading zero', async () => {
    const bytes = new TextEncoder().encode('abc')

    const hex = await sha256Hex(bytes)

    expect(hex).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
