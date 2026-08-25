import { describe, expect, it } from 'vite-plus/test'

import { parseEmojiGroups, parseEmojiVersion } from './emoji-test'

const sample = [
  '# Version: 17.0',
  '',
  '# group: Smileys & Emotion',
  '',
  '# subgroup: face-smiling',
  '1F600 ; fully-qualified # 😀 E1.0 grinning face',
  '1F601 ; fully-qualified # 😁 E0.6 beaming face',
  '2764 FE0F ; fully-qualified # ❤️ E0.6 red heart',
  '2764 ; unqualified # ❤ E0.6 red heart',
  '',
  '# group: Food & Drink',
  '1F34F ; fully-qualified # 🍏 E1.0 green apple',
  '1F468 200D 1F373 ; fully-qualified # 👨‍🍳 E4.0 man cook',
  '',
].join('\n')

describe('parseEmojiGroups', () => {
  it('maps single-codepoint emoji to their group slug', () => {
    const groups = parseEmojiGroups(sample)

    expect(groups.get(0x1f600)).toBe('smileys-emotion')
    expect(groups.get(0x1f34f)).toBe('food-drink')
  })

  it('reduces VS16 emoji to their base codepoint', () => {
    const groups = parseEmojiGroups(sample)

    expect(groups.get(0x2764)).toBe('smileys-emotion')
  })

  it('skips multi-codepoint sequences', () => {
    const groups = parseEmojiGroups(sample)

    expect(groups.has(0x1f468)).toBe(false)
  })

  it('ignores the preamble and keeps one entry per base codepoint', () => {
    const groups = parseEmojiGroups(sample)

    expect(groups.size).toBe(4)
  })
})

describe('parseEmojiVersion', () => {
  it('reads the version header', () => {
    expect(parseEmojiVersion(sample)).toBe('17.0')
  })

  it('falls back to unknown when the header is absent', () => {
    expect(parseEmojiVersion('# group: X\n1F600 ; fully-qualified # 😀')).toBe('unknown')
  })
})
