import type { MiddlewareHandler } from 'hono'

import { licenseLink } from '../../domain/attribution'

export const licenseHeaderMiddleware: MiddlewareHandler = async (c, next) => {
  await next()
  // only responses that actually carry the artwork (2xx), not 404s
  if (c.res.ok) c.header('link', licenseLink())
}
