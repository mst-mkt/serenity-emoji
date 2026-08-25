import { COLOR_FORMATS, formatColor } from '@serenity-emoji/image/color/format'
import { scaleToFit } from '@serenity-emoji/image/scale'
import { define } from 'gunshi'

import { renderArgs } from './shared/args'
import { loadGridOrExit } from './shared/load'

export const jsonCommand = define({
  name: 'json',
  description: 'Render an emoji as a json color grid',
  args: {
    ...renderArgs,
    colorFormat: {
      type: 'enum',
      choices: COLOR_FORMATS,
      default: 'object',
      toKebab: true,
      description: 'Color representation of each cell',
    },
  },
  run: async (ctx) => {
    const { emoji, emojiDir, size, square, colorFormat } = ctx.values
    const grid = await loadGridOrExit(emoji, { emojiDir, square })

    const colored = scaleToFit(grid, size).map((row) =>
      row.map((color) => formatColor(color, colorFormat)),
    )
    console.log(JSON.stringify(colored))
  },
})
