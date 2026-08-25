import { base64 } from '@serenity-emoji/lib/base64'

// iTerm2 Inline Images Protocol (OSC 1337), BEL-terminated
export const toIterm = (png: Uint8Array) => {
  const length = png.length
  const base64Data = base64(png)

  return `\x1b]1337;File=inline=1;size=${length}:${base64Data}\x07`
}
