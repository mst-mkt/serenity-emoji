import { describe, expect, it } from 'vite-plus/test'

import {
  hasPrivateUse,
  stemOfEmojiFile,
  textCodePoints,
  toCodePoints,
  toStem,
  withoutVariationSelectors,
} from './emoji'

describe('toStem', () => {
  it('converts a single codepoint emoji', () => {
    const emoji = '😀'

    const stem = toStem(emoji)

    expect(stem).toBe('U+1F600')
  })

  it('does not pad short codepoints', () => {
    const emoji = '©'

    const stem = toStem(emoji)

    expect(stem).toBe('U+A9')
  })

  it('joins sequence codepoints with underscores', () => {
    const emoji = '👨‍👩‍👧'

    const stem = toStem(emoji)

    expect(stem).toBe('U+1F468_U+200D_U+1F469_U+200D_U+1F467')
  })

  it('keeps variation selectors in the stem', () => {
    const emoji = '❤️'

    const stem = toStem(emoji)

    expect(stem).toBe('U+2764_U+FE0F')
  })
})

describe('toCodePoints', () => {
  it('parses a single unit stem', () => {
    const stem = 'U+1F600'

    const codePoints = toCodePoints(stem)

    expect(codePoints).toEqual([0x1f600])
  })

  it('parses every unit of a sequence stem', () => {
    const stem = 'U+2764_U+FE0F_U+200D_U+1F525'

    const codePoints = toCodePoints(stem)

    expect(codePoints).toEqual([0x2764, 0xfe0f, 0x200d, 0x1f525])
  })
})

describe('hasPrivateUse', () => {
  it('detects plane 16 private use codepoints', () => {
    const stem = 'U+10CD60'

    const result = hasPrivateUse(stem)

    expect(result).toBe(true)
  })

  it('detects bmp private use codepoints', () => {
    const stem = 'U+E000'

    const result = hasPrivateUse(stem)

    expect(result).toBe(true)
  })

  it('detects a private use unit inside a sequence', () => {
    const stem = 'U+1F600_U+10CD00'

    const result = hasPrivateUse(stem)

    expect(result).toBe(true)
  })

  it('returns false for regular emoji stems', () => {
    const stems = ['U+1F600', 'U+A9', 'U+1F3F3_U+FE0F_U+200D_U+1F308']

    const results = stems.map(hasPrivateUse)

    expect(results).toEqual([false, false, false])
  })
})

describe('stemOfEmojiFile', () => {
  it('extracts the stem from an emoji png file name', () => {
    const fileName = 'U+1F600.png'

    const stem = stemOfEmojiFile(fileName)

    expect(stem).toBe('U+1F600')
  })

  it('extracts a sequence stem', () => {
    const fileName = 'U+1F468_U+200D_U+1F469_U+200D_U+1F467.png'

    const stem = stemOfEmojiFile(fileName)

    expect(stem).toBe('U+1F468_U+200D_U+1F469_U+200D_U+1F467')
  })

  it('rejects files that are not emoji pngs', () => {
    const fileNames = ['README.md', 'U+1F600.svg', 'emoji.png']

    const stems = fileNames.map(stemOfEmojiFile)

    expect(stems).toEqual([null, null, null])
  })

  it('rejects private use stems', () => {
    const fileName = 'U+10CD60.png'

    const stem = stemOfEmojiFile(fileName)

    expect(stem).toBeNull()
  })
})

describe('withoutVariationSelectors', () => {
  it('drops FE0F units from a stem', () => {
    const stem = 'U+2764_U+FE0F_U+200D_U+1F525'

    const bare = withoutVariationSelectors(stem)

    expect(bare).toBe('U+2764_U+200D_U+1F525')
  })

  it('returns a stem without FE0F unchanged', () => {
    const stem = 'U+1F600'

    const bare = withoutVariationSelectors(stem)

    expect(bare).toBe('U+1F600')
  })
})

describe('textCodePoints', () => {
  it('collects codepoints and drops variation selectors', () => {
    const points = textCodePoints('😀❤️')

    expect([...points].toSorted((a, b) => a - b)).toEqual([0x2764, 0x1f600])
  })
})
