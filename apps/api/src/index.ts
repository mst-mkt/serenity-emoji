import { Hono } from 'hono'
import { Cron } from 'kuron'

import type { AppEnv, Bindings } from './bindings'
import { emojiRoutes } from './routes/emoji'
import { fontRoutes } from './routes/fonts'
import { build } from './scheduled/build'
import { sync } from './scheduled/sync'

const app = new Hono<AppEnv>()
const cron = new Cron<AppEnv>()

app
  .get('/', (c) => c.text('Serenity Emoji'))
  .route('/', fontRoutes)
  .route('/', emojiRoutes)

cron
  .schedule('0 * * * *', sync) // every hour
  .schedule('30 0 */3 * *', build) // every 3 days at 00:30

export default {
  fetch: app.fetch,
  scheduled: cron.scheduled,
} satisfies ExportedHandler<Bindings>
