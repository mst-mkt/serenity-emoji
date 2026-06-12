import { env } from 'cloudflare:workers'
import * as v from 'valibot'

import type { Snapshot } from '../sync/snapshot'

const SNAPSHOT_KEY = 'snapshot/grids.json.gz'

const SNAPSHOT_DIGEST_KEY = 'snapshot:digest'

export const getSnapshotDigest = () => env.KV.get(SNAPSHOT_DIGEST_KEY)

export const putSnapshotDigest = (digest: string) => env.KV.put(SNAPSHOT_DIGEST_KEY, digest)

const ByteSchema = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(255))
const RgbaSchema = v.object({ r: ByteSchema, g: ByteSchema, b: ByteSchema, a: ByteSchema })
const SnapshotSchema = v.record(
  v.string(),
  v.object({ sha: v.string(), grid: v.array(v.array(RgbaSchema)) }),
)

const gunzip = async (bytes: ArrayBuffer) => {
  const decompressionStream = new DecompressionStream('gzip')
  const stream = new Response(bytes).body?.pipeThrough(decompressionStream)
  return new Response(stream).text()
}

const gzip = async (text: string) => {
  const compressionStream = new CompressionStream('gzip')
  const stream = new Response(text).body?.pipeThrough(compressionStream)
  const arrayBuffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

export const getSnapshot = async (): Promise<Snapshot> => {
  const object = await env.R2.get(SNAPSHOT_KEY)
  if (object === null) return new Map()

  const arrayBuffer = await object.arrayBuffer()
  const gunzipped = await gunzip(arrayBuffer)
  const rawJson = JSON.parse(gunzipped)
  const parsed = v.parse(SnapshotSchema, rawJson)

  return new Map(Object.entries(parsed))
}

export const putSnapshot = async (snapshot: Snapshot) => {
  const snapshotObj = Object.fromEntries(snapshot)
  const stringified = JSON.stringify(snapshotObj)
  const body = await gzip(stringified)

  return env.R2.put(SNAPSHOT_KEY, body)
}
