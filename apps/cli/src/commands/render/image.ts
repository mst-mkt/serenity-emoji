import { toIterm } from '@serenity-emoji/image/render/iterm'
import { toKitty } from '@serenity-emoji/image/render/kitty'
import { toPng } from '@serenity-emoji/image/render/png'
import { toSixel } from '@serenity-emoji/image/render/sixel'
import { scaleToFit } from '@serenity-emoji/image/scale'
import { define } from 'gunshi'

import { renderArgs } from './shared/args'
import { loadGridOrExit } from './shared/load'

const DEFAULT_SIZE = 512

const PROTOCOLS = ['kitty', 'iterm', 'sixel'] as const

const isKittyTerminal = (env: NodeJS.ProcessEnv) => {
  return (
    env.KITTY_WINDOW_ID !== undefined ||
    (env.TERM?.includes('kitty') ?? false) ||
    (env.TERM?.includes('ghostty') ?? false)
  )
}

const isItermTerminal = (env: NodeJS.ProcessEnv) => {
  return (
    env.TERM_PROGRAM === 'iTerm.app' ||
    env.TERM_PROGRAM === 'WezTerm' ||
    env.LC_TERMINAL === 'iTerm2'
  )
}

const isSixelTerminal = (env: NodeJS.ProcessEnv) => {
  return env.TERM === 'foot' || env.TERM === 'mlterm' || env.TERM === 'yaft-256color'
}

const detectProtocol = () => {
  if (!process.stdout.isTTY) return null
  if (isKittyTerminal(process.env)) return 'kitty'
  if (isItermTerminal(process.env)) return 'iterm'
  if (isSixelTerminal(process.env)) return 'sixel'
  return null
}

export const imageCommand = define({
  name: 'image',
  description: 'Display an emoji with the terminal graphics protocol',
  args: {
    ...renderArgs,
    protocol: {
      type: 'enum',
      choices: PROTOCOLS,
      description: 'Skip detection and use this protocol',
    },
  },
  run: async (ctx) => {
    const { emoji, emojiDir, size, square, protocol } = ctx.values

    const resolved = protocol ?? detectProtocol()
    if (resolved === null) {
      console.error('terminal graphics not supported; use --protocol or "render ansi"')
      process.exit(1)
    }

    const grid = await loadGridOrExit(emoji, { emojiDir, square })
    if (resolved === 'sixel') {
      console.log(toSixel(scaleToFit(grid, size ?? DEFAULT_SIZE)))
      return
    }

    const png = await toPng(grid, { size: size ?? DEFAULT_SIZE })
    console.log(resolved === 'kitty' ? toKitty(png) : toIterm(png))
  },
})
