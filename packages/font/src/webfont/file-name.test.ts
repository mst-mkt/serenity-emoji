import { describe, expect, it } from 'vite-plus/test'

import { formatFontFile, parseFontFile } from './file-name'

describe('formatFontFile', () => {
  it('formats a latest file name', () => {
    const file = { subset: 'full', digest: null, format: 'ttf' } as const

    const name = formatFontFile(file)

    expect(name).toBe('serenity-emoji.full.ttf')
  })

  it('formats a digest file name', () => {
    const file = { subset: 'full', digest: '0123456789abcdef', format: 'woff' } as const

    const name = formatFontFile(file)

    expect(name).toBe('serenity-emoji.full.0123456789abcdef.woff')
  })

  it('round-trips through parseFontFile', () => {
    const file = { subset: 'smileys-emotion', digest: '0123456789abcdef', format: 'ttf' } as const

    const parsed = parseFontFile(formatFontFile(file))

    expect(parsed).toEqual(file)
  })
})

describe('parseFontFile', () => {
  it('parses a latest file name', () => {
    const file = 'serenity-emoji.full.ttf'

    const parsed = parseFontFile(file)

    expect(parsed).toEqual({ subset: 'full', digest: null, format: 'ttf' })
  })

  it('parses a digest file name', () => {
    const file = 'serenity-emoji.full.0123456789abcdef.ttf'

    const parsed = parseFontFile(file)

    expect(parsed).toEqual({ subset: 'full', digest: '0123456789abcdef', format: 'ttf' })
  })

  it('parses woff file names', () => {
    const files = ['serenity-emoji.full.woff', 'serenity-emoji.full.0123456789abcdef.woff']

    const results = files.map(parseFontFile)

    expect(results).toEqual([
      { subset: 'full', digest: null, format: 'woff' },
      { subset: 'full', digest: '0123456789abcdef', format: 'woff' },
    ])
  })

  it('rejects names outside the key scheme', () => {
    const files = [
      'other.full.ttf',
      'serenity-emoji.full.woff2',
      'serenity-emoji.full.otf',
      'serenity-emoji..ttf',
      'serenity-emoji.Full.ttf',
      'serenity-emoji.fu/ll.ttf',
      'serenity-emoji.full.0123.ttf',
      'serenity-emoji.full.0123456789ABCDEF.ttf',
      'serenity-emoji.full.0123456789abcdef.extra.ttf',
      'serenity-emoji.ttf',
      'serenity-emoji.woff',
    ]

    const results = files.map(parseFontFile)

    expect(results).toEqual(files.map(() => null))
  })
})
