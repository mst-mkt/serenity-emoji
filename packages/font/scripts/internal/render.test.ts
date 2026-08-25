import { describe, expect, it } from 'vite-plus/test'

import { renderEmojiGroups } from './render'

const groups = new Map<number, string>([
  [0x1f600, 'smileys-emotion'],
  [0x1f680, 'travel-places'],
  [0x2b50, 'travel-places'],
])

describe('renderEmojiGroups', () => {
  it('emits the version and a const-asserted group table', () => {
    const source = renderEmojiGroups(groups, '17.0')

    expect(source).toContain("export const EMOJI_VERSION = '17.0'")
    expect(source).toContain('export const EMOJI_GROUPS = {')
    expect(source).toContain('} as const satisfies Record<string, number[]>')
  })

  it('sorts groups by slug and codepoints ascending', () => {
    const source = renderEmojiGroups(groups, '17.0')

    expect(source).toContain("'smileys-emotion': [0x1F600],")
    expect(source).toContain("'travel-places': [0x2B50, 0x1F680],")
    expect(source.indexOf('smileys-emotion')).toBeLessThan(source.indexOf('travel-places'))
  })
})
