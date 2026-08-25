import { licenseLink } from '@serenity-emoji/emoji/attribution'
import type { MiddlewareHandler } from 'hono'

export const licenseHeaderMiddleware: MiddlewareHandler = async (c, next) => {
  await next()
  // only responses that actually carry the artwork (2xx), not 404s
  if (c.res.ok) c.header('link', licenseLink())
}
