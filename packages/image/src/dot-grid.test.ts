import { describe, expect, it } from 'vite-plus/test'

import { toRuns } from './dot-grid'
import { rgba } from './test/fixtures'

describe('toRuns', () => {
  it('merges adjacent pixels of the same color', () => {
    const row = [rgba(255, 0, 0), rgba(255, 0, 0), rgba(0, 0, 255)]

    const runs = toRuns(row)

    expect(runs).toEqual([
      { x: 0, width: 2, color: rgba(255, 0, 0) },
      { x: 2, width: 1, color: rgba(0, 0, 255) },
    ])
  })

  it('skips fully transparent pixels', () => {
    const row = [rgba(255, 0, 0), rgba(0, 0, 0, 0), rgba(255, 0, 0)]

    const runs = toRuns(row)

    expect(runs).toEqual([
      { x: 0, width: 1, color: rgba(255, 0, 0) },
      { x: 2, width: 1, color: rgba(255, 0, 0) },
    ])
  })

  it('splits runs when only the alpha differs', () => {
    const row = [rgba(1, 2, 3, 10), rgba(1, 2, 3, 20)]

    const runs = toRuns(row)

    expect(runs).toEqual([
      { x: 0, width: 1, color: rgba(1, 2, 3, 10) },
      { x: 1, width: 1, color: rgba(1, 2, 3, 20) },
    ])
  })
})
