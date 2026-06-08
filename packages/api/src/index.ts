import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Serenity Emoji'))

export default app
