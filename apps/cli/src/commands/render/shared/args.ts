import type { Args } from 'gunshi'

export const renderArgs = {
  emoji: {
    type: 'positional',
    description: 'Emoji character, U+ stem, or :shortcode:',
  },
  emojiDir: {
    type: 'string',
    toKebab: true,
    description: 'Read from a local emoji png directory instead of the api',
  },
  size: {
    type: 'custom',
    parse: (value: string) => {
      const size = Number(value)
      const isValid = Number.isInteger(size) && size >= 1 && size <= 2048
      if (!isValid) throw new Error('size must be an integer between 1 and 2048')
      return size
    },
    description: 'Output size (1-2048)',
  },
  square: {
    type: 'boolean',
    description: 'Pad the artwork to a square',
  },
} as const satisfies Args
