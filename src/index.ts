import { Hono } from 'hono'
import { Cron } from 'kuron'

import type { AppEnv, Bindings } from './bindings'
import { handleFontBuild, handleSync } from './routes/cron'
import { emojiRoutes } from './routes/emoji'
import { fontRoutes } from './routes/font'

const app = new Hono<AppEnv>()
const cron = new Cron<AppEnv>()

app
  .get('/', (c) => c.text('Serenity Emoji'))
  .route('/', fontRoutes)
  .route('/', emojiRoutes)

cron
  .schedule('0 * * * *', handleSync) // every hour
  .schedule('30 0 */3 * *', handleFontBuild) // every 3 days at 00:30

export default {
  fetch: app.fetch,
  scheduled: cron.scheduled,
} satisfies ExportedHandler<Bindings>
