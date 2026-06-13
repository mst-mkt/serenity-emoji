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

const fontFace = ({ subset, range }: SubsetEntry) => {
  const src = sources([
    {
      url: `https://serenity.keito.dev/font/serenity-emoji.${subset}.woff`,
      format: 'woff',
    },
  ])

  const rule = cssRule('@font-face', [
    declaration('font-family', "'Serenity Emoji'"),
    declaration('src', src),
    declaration('font-display', 'swap'),
    ...(range === null ? [] : [declaration('unicode-range', range)]),
  ])

  return rule
}

export const toFontFaceCss = (manifest: SubsetEntry[]) => {
  return manifest.map(fontFace).join('\n\n')
}
