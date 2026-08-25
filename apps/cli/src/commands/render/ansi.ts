import { toAnsi } from '@serenity-emoji/image/render/ansi'
import { scaleToFit } from '@serenity-emoji/image/scale'
import { define } from 'gunshi'

import { renderArgs } from './shared/args'
import { loadGridOrExit } from './shared/load'

export const ansiCommand = define({
  name: 'ansi',
  description: 'Render an emoji as ansi colored text',
  args: renderArgs,
  run: async (ctx) => {
    const { emoji, emojiDir, size, square } = ctx.values
    const grid = await loadGridOrExit(emoji, { emojiDir, square })

    process.stdout.write(toAnsi(scaleToFit(grid, size)))
  },
})
