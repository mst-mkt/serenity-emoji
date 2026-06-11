import { Hono } from 'hono'
import { Cron } from 'kuron'

import type { AppEnv, Bindings } from './bindings'
import { handleSync } from './routes/cron'
import { emojiRoutes } from './routes/emoji'

const app = new Hono<AppEnv>()
const cron = new Cron<AppEnv>()

app.get('/', (c) => c.text('Serenity Emoji')).route('/', emojiRoutes)
cron.schedule('0 * * * *', handleSync)

export default {
  fetch: app.fetch,
  scheduled: cron.scheduled,
} satisfies ExportedHandler<Bindings>
