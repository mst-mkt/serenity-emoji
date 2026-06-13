import { describe, expect, it } from 'vite-plus/test'

import { toFontFaceCss } from './css'

describe('toFontFaceCss', () => {
  it('emits a font-face per subset with a woff source and unicode-range', () => {
    const css = toFontFaceCss([{ subset: 'emoticons', range: 'U+1F600-1F64F' }])

    expect(css).toContain("font-family: 'Serenity Emoji';")
    expect(css).toContain(
      "src: url('https://serenity.keito.dev/font/serenity-emoji.emoticons.woff') format('woff');",
    )
    expect(css).toContain('unicode-range: U+1F600-1F64F;')
  })

  it('omits unicode-range for the full fallback', () => {
    const css = toFontFaceCss([{ subset: 'full', range: null }])

    expect(css).not.toContain('unicode-range')
  })

  it('separates multiple faces with a blank line', () => {
    const css = toFontFaceCss([
      { subset: 'full', range: null },
      { subset: 'emoticons', range: 'U+1F600' },
    ])

    expect(css.split('\n\n')).toHaveLength(2)
  })
})
