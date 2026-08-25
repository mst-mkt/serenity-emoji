import { FONT_FAMILY } from '../tables/metadata'
import { formatFontFile } from './file-name'
import type { SubsetEntry } from './subsets'

type FontSource = {
  url: string
  format: string
}

const url = (url: FontSource['url']) => `url('${url}')`
const format = (format: FontSource['format']) => `format('${format}')`
const sources = (sources: FontSource[]) => {
  return sources.map((source) => `${url(source.url)} ${format(source.format)}`).join(', ')
}
const declaration = (property: string, value: string) => `${property}: ${value}`
const cssRule = (selector: string, declarations: string[]) => {
  const body = declarations.map((line) => `  ${line};`).join('\n')

  return `${selector} {\n${body}\n}`
}

const fontFace = ({ subset, range }: SubsetEntry, baseUrl: string) => {
  const src = sources([
    {
      url: `${baseUrl}/font/${formatFontFile({ subset, digest: null, format: 'woff' })}`,
      format: 'woff',
    },
  ])

  const rule = cssRule('@font-face', [
    declaration('font-family', `'${FONT_FAMILY}'`),
    declaration('src', src),
    declaration('font-display', 'swap'),
    ...(range === null ? [] : [declaration('unicode-range', range)]),
  ])

  return rule
}

export const toFontFaceCss = (manifest: SubsetEntry[], baseUrl: string) => {
  return manifest.map((entry) => fontFace(entry, baseUrl)).join('\n\n')
}
