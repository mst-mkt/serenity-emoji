import { toSquare } from '@serenity-emoji/image/square'

import { resolveStem } from './input'
import { loadGrid } from './source'

type LoadOptions = { emojiDir: string | undefined; square: boolean | undefined }

export const loadGridOrExit = async (emoji: string, { emojiDir, square }: LoadOptions) => {
  const resolution = resolveStem(emoji)
  if ('error' in resolution) {
    console.error(resolution.error)
    process.exit(1)
  }

  const grid = await loadGrid(resolution.stem, emojiDir)
  if (grid === null) {
    console.error(`emoji not found: ${emoji}`)
    process.exit(1)
  }

  return square ? toSquare(grid) : grid
}
