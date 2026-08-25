import { toSvg } from '@serenity-emoji/image/render/svg'
import { define } from 'gunshi'

import { renderArgs } from './shared/args'
import { loadGridOrExit } from './shared/load'

export const svgCommand = define({
  name: 'svg',
  description: 'Render an emoji as an svg document',
  args: renderArgs,
  run: async (ctx) => {
    const { emoji, emojiDir, size, square } = ctx.values
    const grid = await loadGridOrExit(emoji, { emojiDir, square })

    console.log(toSvg(grid, { size }))
  },
})
