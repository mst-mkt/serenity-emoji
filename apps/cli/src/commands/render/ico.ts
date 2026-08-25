import { toIco } from '@serenity-emoji/image/render/ico'
import { toPng } from '@serenity-emoji/image/render/png'
import { define } from 'gunshi'

import { renderArgs } from './shared/args'
import { loadGridOrExit } from './shared/load'

const MAX_SIZE = 256

export const icoCommand = define({
  name: 'ico',
  description: 'Render an emoji as an ico binary',
  args: renderArgs,
  run: async (ctx) => {
    const { emoji, emojiDir, size, square } = ctx.values
    const grid = await loadGridOrExit(emoji, { emojiDir, square })

    const png = await toPng(grid, { size: Math.min(size ?? MAX_SIZE, MAX_SIZE) })
    process.stdout.write(toIco(png))
  },
})
