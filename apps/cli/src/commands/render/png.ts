import { toPng } from '@serenity-emoji/image/render/png'
import { define } from 'gunshi'

import { renderArgs } from './shared/args'
import { loadGridOrExit } from './shared/load'

const DEFAULT_SIZE = 512

export const pngCommand = define({
  name: 'png',
  description: 'Render an emoji as a png binary',
  args: renderArgs,
  run: async (ctx) => {
    const { emoji, emojiDir, size, square } = ctx.values
    const grid = await loadGridOrExit(emoji, { emojiDir, square })

    const png = await toPng(grid, { size: size ?? DEFAULT_SIZE })
    process.stdout.write(png)
  },
})
