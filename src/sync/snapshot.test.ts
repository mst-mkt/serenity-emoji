import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../core/fixtures'
import { applySnapshot, digestOfEntries, planBackfill, type Snapshot } from './snapshot'

const GRID = [[rgba(255, 0, 0)]]

describe('planBackfill', () => {
  it('picks entries whose snapshot is stale but whose kv copy matches the tree', () => {
    const tree = [{ name: 'U+1F600', sha: 'b' }]
    const stored = [{ name: 'U+1F600', sha: 'b' }]
    const snapshot: Snapshot = new Map([['U+1F600', { sha: 'a', grid: GRID }]])

    const targets = planBackfill(tree, stored, snapshot, [], 10)

    expect(targets).toEqual([{ name: 'U+1F600', sha: 'b' }])
  })

  it('skips entries that were just applied', () => {
    const tree = [{ name: 'U+1F600', sha: 'b' }]
    const stored = [{ name: 'U+1F600', sha: 'b' }]
    const applied = [{ name: 'U+1F600', sha: 'b', grid: GRID }]

    const targets = planBackfill(tree, stored, new Map(), applied, 10)

    expect(targets).toEqual([])
  })

  it('skips entries whose kv copy is still stale', () => {
    const tree = [{ name: 'U+1F600', sha: 'b' }]
    const stored = [{ name: 'U+1F600', sha: 'a' }]

    const targets = planBackfill(tree, stored, new Map(), [], 10)

    expect(targets).toEqual([])
  })

  it('skips entries the snapshot already has', () => {
    const tree = [{ name: 'U+1F600', sha: 'a' }]
    const stored = [{ name: 'U+1F600', sha: 'a' }]
    const snapshot: Snapshot = new Map([['U+1F600', { sha: 'a', grid: GRID }]])

    const targets = planBackfill(tree, stored, snapshot, [], 10)

    expect(targets).toEqual([])
  })

  it('caps targets at the limit', () => {
    const tree = [
      { name: 'U+0031', sha: 'a' },
      { name: 'U+0032', sha: 'b' },
      { name: 'U+0033', sha: 'c' },
    ]

    const targets = planBackfill(tree, tree, new Map(), [], 2)

    expect(targets).toEqual([
      { name: 'U+0031', sha: 'a' },
      { name: 'U+0032', sha: 'b' },
    ])
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

describe('applySnapshot', () => {
  it('applies updates and reports completion', () => {
    const snapshot: Snapshot = new Map()
    const tree = [{ name: 'U+1F600', sha: 'a' }]

    const { next, changed, complete } = applySnapshot(snapshot, tree, [
      { name: 'U+1F600', sha: 'a', grid: GRID },
    ])

    expect(next.get('U+1F600')).toEqual({ sha: 'a', grid: GRID })
    expect(changed).toBe(true)
    expect(complete).toBe(true)
  })

  it('drops entries gone from the tree', () => {
    const snapshot: Snapshot = new Map([['U+1F600', { sha: 'a', grid: GRID }]])

    const { next, changed, complete } = applySnapshot(snapshot, [], [])

    expect(next.size).toBe(0)
    expect(changed).toBe(true)
    expect(complete).toBe(true)
  })

  it('reports no change when the snapshot already matches the tree', () => {
    const snapshot: Snapshot = new Map([['U+1F600', { sha: 'a', grid: GRID }]])
    const tree = [{ name: 'U+1F600', sha: 'a' }]

    const { changed, complete } = applySnapshot(snapshot, tree, [])

    expect(changed).toBe(false)
    expect(complete).toBe(true)
  })

  it('stays incomplete while entries are missing or stale', () => {
    const snapshot: Snapshot = new Map([['U+1F600', { sha: 'a', grid: GRID }]])
    const tree = [
      { name: 'U+1F600', sha: 'b' },
      { name: 'U+1F601', sha: 'c' },
    ]

    const { changed, complete } = applySnapshot(snapshot, tree, [])

    expect(changed).toBe(false)
    expect(complete).toBe(false)
  })

  it('overwrites stale entries with their update', () => {
    const snapshot: Snapshot = new Map([['U+1F600', { sha: 'a', grid: GRID }]])
    const tree = [{ name: 'U+1F600', sha: 'b' }]

    const { next, complete } = applySnapshot(snapshot, tree, [
      { name: 'U+1F600', sha: 'b', grid: GRID },
    ])

    expect(next.get('U+1F600')?.sha).toBe('b')
    expect(complete).toBe(true)
  })
})
