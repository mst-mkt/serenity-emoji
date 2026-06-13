import { describe, expect, it } from 'vite-plus/test'

import { digestOfEntries, nextStored, planSync } from './sync'

describe('planSync', () => {
  it('puts entries that are not stored yet', () => {
    const tree = [{ name: 'U+1F600', sha: 'a' }]

    const plan = planSync(tree, [], 10)

    expect(plan).toEqual({ puts: [{ name: 'U+1F600', sha: 'a' }], deletes: [], remaining: 0 })
  })

  it('puts entries whose sha changed', () => {
    const tree = [{ name: 'U+1F600', sha: 'b' }]
    const stored = [{ name: 'U+1F600', sha: 'a' }]

    const plan = planSync(tree, stored, 10)

    expect(plan.puts).toEqual([{ name: 'U+1F600', sha: 'b' }])
  })

  it('skips entries whose sha is unchanged', () => {
    const tree = [{ name: 'U+1F600', sha: 'a' }]
    const stored = [{ name: 'U+1F600', sha: 'a' }]

    const plan = planSync(tree, stored, 10)

    expect(plan.puts).toEqual([])
  })

  it('deletes stored entries missing from the tree', () => {
    const stored = [{ name: 'U+1F600', sha: 'a' }]

    const plan = planSync([], stored, 10)

    expect(plan.deletes).toEqual(['U+1F600'])
  })

  it('caps puts at the limit, keeping deletes intact', () => {
    const tree = [
      { name: 'U+0031', sha: 'a' },
      { name: 'U+0032', sha: 'b' },
      { name: 'U+0033', sha: 'c' },
    ]
    const stored = [{ name: 'U+0034', sha: 'd' }]

    const plan = planSync(tree, stored, 2)

    expect(plan.puts).toEqual([
      { name: 'U+0031', sha: 'a' },
      { name: 'U+0032', sha: 'b' },
    ])
    expect(plan.deletes).toEqual(['U+0034'])
    expect(plan.remaining).toBe(1)
  })
})

describe('nextStored', () => {
  it('adds applied entries with their new sha', () => {
    const stored = [{ name: 'U+1F600', sha: 'a' }]
    const applied = [{ name: 'U+1F601', sha: 'b', grid: [] }]

    const next = nextStored(stored, applied, [])

    expect(next).toEqual([
      { name: 'U+1F600', sha: 'a' },
      { name: 'U+1F601', sha: 'b' },
    ])
  })

  it('replaces a stored entry with its applied update', () => {
    const stored = [{ name: 'U+1F600', sha: 'a' }]
    const applied = [{ name: 'U+1F600', sha: 'b', grid: [] }]

    const next = nextStored(stored, applied, [])

    expect(next).toEqual([{ name: 'U+1F600', sha: 'b' }])
  })

  it('drops deleted entries', () => {
    const stored = [
      { name: 'U+1F600', sha: 'a' },
      { name: 'U+1F601', sha: 'b' },
    ]

    const next = nextStored(stored, [], ['U+1F600'])

    expect(next).toEqual([{ name: 'U+1F601', sha: 'b' }])
  })

  it('keeps untouched stored entries with their existing sha', () => {
    const stored = [{ name: 'U+1F600', sha: 'a' }]

    const next = nextStored(stored, [], [])

    expect(next).toEqual([{ name: 'U+1F600', sha: 'a' }])
  })
})

describe('digestOfEntries', () => {
  it('is independent of entry order', async () => {
    const entries = [
      { name: 'U+1F600', sha: 'a' },
      { name: 'U+1F601', sha: 'b' },
    ]

    const digest = await digestOfEntries(entries)
    const reversed = await digestOfEntries(entries.toReversed())

    expect(reversed).toBe(digest)
  })

  it('changes when a sha changes', async () => {
    const entries = [{ name: 'U+1F600', sha: 'a' }]

    const digest = await digestOfEntries(entries)
    const other = await digestOfEntries([{ name: 'U+1F600', sha: 'b' }])

    expect(other).not.toBe(digest)
  })
})
