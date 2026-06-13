import type { Rgba } from '../dot-grid'

type Channels = { r: number; g: number; b: number }
type Xyz = { x: number; y: number; z: number }

const srgbToLinear = (channel: number) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

const toLinear = ({ r, g, b }: Rgba) => ({
  r: srgbToLinear(r),
  g: srgbToLinear(g),
  b: srgbToLinear(b),
})

const hueOf = (a: number, b: number) => ((((Math.atan2(b, a) * 180) / Math.PI) % 360) + 360) % 360

const rgbHue = (r: number, g: number, b: number, max: number, delta: number) => {
  if (delta === 0) return 0

  const sextant =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return (((sextant * 60) % 360) + 360) % 360
}

export const toHsl = ({ r, g, b }: Rgba) => {
  const [r1, g1, b1] = [r / 255, g / 255, b / 255]
  const max = Math.max(r1, g1, b1)
  const min = Math.min(r1, g1, b1)
  const delta = max - min
  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return { h: rgbHue(r1, g1, b1, max, delta), s: s * 100, l: l * 100 }
}

export const toHwb = ({ r, g, b }: Rgba) => {
  const [r1, g1, b1] = [r / 255, g / 255, b / 255]
  const max = Math.max(r1, g1, b1)
  const min = Math.min(r1, g1, b1)

  return { h: rgbHue(r1, g1, b1, max, max - min), w: min * 100, b: (1 - max) * 100 }
}

// linear sRGB to CIE XYZ (D65): the fixed sRGB-primaries matrix from CSS Color 4
const toXyz = ({ r, g, b }: Channels) => ({
  x: 0.4123907992659593 * r + 0.357584339383878 * g + 0.1804807884018343 * b,
  y: 0.2126390058715102 * r + 0.715168678767756 * g + 0.07219231536073371 * b,
  z: 0.01933081871559182 * r + 0.11919477979462598 * g + 0.9505321522496607 * b,
})

// Bradford adaptation from D65 to D50, the reference white css lab() uses
const toD50 = ({ x, y, z }: Xyz) => ({
  x: 1.0479298208405488 * x + 0.022946793341019088 * y - 0.05019222954313557 * z,
  y: 0.029627815688159344 * x + 0.990434484573249 * y - 0.01707382502938514 * z,
  z: -0.009243058152591178 * x + 0.015055144896577895 * y + 0.7518742899580008 * z,
})

const D50_WHITE = { x: 0.3457 / 0.3585, y: 1, z: (1 - 0.3457 - 0.3585) / 0.3585 }
const LAB_EPSILON = 216 / 24389
const LAB_KAPPA = 24389 / 27

const labF = (t: number) => (t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116)

const xyzToLab = ({ x, y, z }: Xyz) => {
  const fx = labF(x / D50_WHITE.x)
  const fy = labF(y / D50_WHITE.y)
  const fz = labF(z / D50_WHITE.z)

  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

export const toLab = (color: Rgba) => xyzToLab(toD50(toXyz(toLinear(color))))

export const toLch = (color: Rgba) => {
  const { l, a, b } = toLab(color)
  return { l, c: Math.hypot(a, b), h: hueOf(a, b) }
}

// linear sRGB to OKLab (Björn Ottosson's matrices)
const linearToOklab = ({ r, g, b }: Channels) => {
  const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const medium = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return {
    l: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    a: 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
    b: 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
  }
}

export const toOklab = (color: Rgba) => linearToOklab(toLinear(color))

export const toOklch = (color: Rgba) => {
  const { l, a, b } = toOklab(color)
  return { l, c: Math.hypot(a, b), h: hueOf(a, b) }
}
