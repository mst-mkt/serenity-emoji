import { env } from 'cloudflare:workers'
import * as v from 'valibot'

import { hasPrivateUse } from '../core/emoji'

const REPO = 'SerenityOS/serenity'
const EMOJI_PATH = 'Base/res/emoji'

const CommitSchema = v.object({
  sha: v.string(),
})

const TreeSchema = v.object({
  truncated: v.boolean(),
  tree: v.array(
    v.object({
      path: v.string(),
      type: v.string(),
      sha: v.string(),
    }),
  ),
})

const headers = () => ({
  'user-agent': 'serenity-emoji (serenity.keito.dev)',
  authorization: `Bearer ${env.GITHUB_TOKEN}`,
})

export const fetchHead = async () => {
  const url = `https://api.github.com/repos/${REPO}/commits/master`
  const response = await fetch(url, { headers: headers() })

  if (!response.ok) throw new Error(`github: ${response.status} for ${url}`)

  const rawData = await response.json()
  const commit = v.parse(CommitSchema, rawData)

  return commit.sha
}

export const fetchEmojiTree = async (commit: string) => {
  const url = `https://api.github.com/repos/${REPO}/git/trees/${commit}:${EMOJI_PATH}`
  const response = await fetch(url, { headers: headers() })

  if (!response.ok) throw new Error(`github: ${response.status} for ${url}`)

  const rawData = await response.json()
  const data = v.parse(TreeSchema, rawData)

  if (data.truncated) throw new Error('github: emoji tree truncated')

  const entries = data.tree.flatMap((node) => {
    if (node.type !== 'blob' || !node.path.startsWith('U+') || !node.path.endsWith('.png')) {
      return []
    }

    const stem = node.path.slice(0, -'.png'.length)
    if (hasPrivateUse(stem)) return []

    return [{ name: stem, sha: node.sha }]
  })

  return entries
}

export const fetchEmojiPng = async (commit: string, name: string) => {
  const url = `https://raw.githubusercontent.com/${REPO}/${commit}/${EMOJI_PATH}/${name}.png`
  const response = await fetch(url)

  if (!response.ok) throw new Error(`github: ${response.status} for ${url}`)

  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  return bytes
}
