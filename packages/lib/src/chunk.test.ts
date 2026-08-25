import { describe, expect, it } from 'vite-plus/test'

import { chunk } from './chunk'

describe('chunk', () => {
  it('returns no batches for an empty array', () => {
    const batches = chunk([], 100)

    expect(batches).toEqual([])
  })

  it('keeps a single batch when items fit within the size', () => {
    const items = Array.from({ length: 99 }, (_, i) => i)

    const batches = chunk(items, 100)

    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(99)
  })

  it('fills exactly one batch at the size boundary', () => {
    const items = Array.from({ length: 100 }, (_, i) => i)

    const batches = chunk(items, 100)

    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(100)
  })

  it('spills the overflow into a second batch', () => {
    const items = Array.from({ length: 101 }, (_, i) => i)

    const batches = chunk(items, 100)

    expect(batches).toHaveLength(2)
    expect(batches[1]).toEqual([100])
  })
})
