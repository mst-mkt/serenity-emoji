import { describe, expect, it } from 'vite-plus/test'

import { base64 } from './base64'

const encode = (text: string) => base64(new TextEncoder().encode(text))

describe('base64', () => {
  it('matches the rfc 4648 test vectors', () => {
    expect(encode('')).toBe('')
    expect(encode('f')).toBe('Zg==')
    expect(encode('fo')).toBe('Zm8=')
    expect(encode('foo')).toBe('Zm9v')
    expect(encode('foob')).toBe('Zm9vYg==')
    expect(encode('fooba')).toBe('Zm9vYmE=')
    expect(encode('foobar')).toBe('Zm9vYmFy')
  })

  it('encodes the full byte range without padding loss', () => {
    const bytes = Uint8Array.from([0, 255, 16, 128, 64])

    expect(encode('\0')).toBe('AA==')
    expect(base64(bytes)).toBe('AP8QgEA=')
  })
})
