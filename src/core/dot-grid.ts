export type Rgba = { r: number; g: number; b: number; a: number }

export type DotGrid = Rgba[][]

// a horizontal run of identical pixels
export type Run = { x: number; width: number; color: Rgba }

const isSameColor = (a: Rgba, b: Rgba) => {
  const isSame = [a.r === b.r, a.g === b.g, a.b === b.b, a.a === b.a]
  return isSame.every(Boolean)
}

const extendsRun = (run: Run | undefined, x: number, color: Rgba): run is Run => {
  return run !== undefined && run.x + run.width === x && isSameColor(run.color, color)
}

// alpha 0 pixels are skipped
export const toRuns = (row: Rgba[]) => {
  return row.reduce<Run[]>((runs, color, x) => {
    if (color.a === 0) return runs

    const last = runs.at(-1)
    if (extendsRun(last, x, color)) {
      last.width += 1
      return runs
    }

    runs.push({ x, width: 1, color })
    return runs
  }, [])
}
