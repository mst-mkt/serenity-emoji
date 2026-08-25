export const chunk = <T>(items: T[], size: number) => {
  return [...Array(Math.ceil(items.length / size))].map((_, i) =>
    items.slice(i * size, (i + 1) * size),
  )
}
