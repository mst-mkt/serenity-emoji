import { env } from 'cloudflare:workers'

// the last head commit whose tree was fully mirrored into kv; an unchanged head skips the run
const COMMIT_KEY = 'sync:commit'

export const getSyncedCommit = () => env.KV.get(COMMIT_KEY)

export const putSyncedCommit = (commit: string) => env.KV.put(COMMIT_KEY, commit)
