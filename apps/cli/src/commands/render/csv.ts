import { COLOR_STRING_FORMATS } from '@serenity-emoji/image/color/format'
import { toCsv } from '@serenity-emoji/image/render/csv'
import { scaleToFit } from '@serenity-emoji/image/scale'
import { define } from 'gunshi'

import { renderArgs } from './shared/args'
import { loadGridOrExit } from './shared/load'

export const csvCommand = define({
  name: 'csv',
  description: 'Render an emoji as csv rows of colors',
  args: {
    ...renderArgs,
    colorFormat: {
      type: 'enum',
      choices: COLOR_STRING_FORMATS,
      default: 'hex',
      toKebab: true,
      description: 'Color representation of each cell',
    },
    separator: {
      type: 'string',
      default: ',',
      description: 'Column separator',
    },
  },
  run: async (ctx) => {
    const { emoji, emojiDir, size, square, colorFormat, separator } = ctx.values
    const grid = await loadGridOrExit(emoji, { emojiDir, square })

    console.log(toCsv(scaleToFit(grid, size), colorFormat, separator))
  },
})
