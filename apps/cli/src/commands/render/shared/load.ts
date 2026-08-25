import { toSquare } from '@serenity-emoji/image/square'

import { fail } from '../../../libs/fail'
import { resolveStem } from '../../../libs/resolve-emoji-stem'
import { loadGrid } from './source'

type LoadOptions = { emojiDir: string | undefined; square: boolean | undefined }

export const loadGridOrExit = async (emoji: string, { emojiDir, square }: LoadOptions) => {
  const { stem, error } = resolveStem(emoji)
  if (error !== undefined) {
    return fail(error)
  }

  const grid = await loadGrid(stem, emojiDir)
  if (grid === null) {
    return fail(`emoji not found: ${emoji}`)
  }

  return square ? toSquare(grid) : grid
}
