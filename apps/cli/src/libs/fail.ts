export const fail = (message: string): never => {
  console.error(message)
  process.exit(1)
}

export const reasonOf = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause))
