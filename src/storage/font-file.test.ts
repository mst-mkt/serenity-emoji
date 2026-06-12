import { describe, expect, it } from 'vite-plus/test'

import { parseFontFile } from './font-file'

describe('parseFontFile', () => {
  it('parses a latest file name', () => {
    const file = 'serenity-emoji.full.ttf'

    const parsed = parseFontFile(file)

    expect(parsed).toEqual({ subset: 'full', digest: null })
  })

  it('parses a digest file name', () => {
    const file = 'serenity-emoji.full.0123456789abcdef.ttf'

    const parsed = parseFontFile(file)

    expect(parsed).toEqual({ subset: 'full', digest: '0123456789abcdef' })
  })

  it('rejects names outside the key scheme', () => {
    const files = [
      'other.full.ttf',
      'serenity-emoji.full.woff',
      'serenity-emoji..ttf',
      'serenity-emoji.Full.ttf',
      'serenity-emoji.fu/ll.ttf',
      'serenity-emoji.full.0123.ttf',
      'serenity-emoji.full.0123456789ABCDEF.ttf',
      'serenity-emoji.full.0123456789abcdef.extra.ttf',
      'serenity-emoji.ttf',
    ]

    const results = files.map(parseFontFile)

    expect(results).toEqual(files.map(() => null))
  })
})
