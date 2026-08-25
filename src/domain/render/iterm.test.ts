import { base64 } from '@serenity-emoji/lib/base64'
import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../../test/fixtures'
import { toIterm } from './iterm'
import { toPng } from './png'

describe('toIterm', () => {
  it('wraps a png in the inline images osc sequence', async () => {
    const png = await toPng([[rgba(255, 0, 0)]])

    const iterm = toIterm(png)

    expect(iterm.startsWith('\x1b]1337;File=inline=1;size=')).toBe(true)
    expect(iterm.endsWith('\x07')).toBe(true)
    expect(iterm).toContain(`;size=${png.length}:`)
    expect(iterm).toContain(base64(png))
  })
})
