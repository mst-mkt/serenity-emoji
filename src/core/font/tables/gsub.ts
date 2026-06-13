import { concat, u16 } from '../../bytes'
import type { Ligature } from '../plan'
import { prefixSums, struct, tag, withSections } from '../write'

// longer sequences first, so extended sequences win over their prefixes
const byPreference = (a: Ligature, b: Ligature) => {
  if (a.components.length !== b.components.length) {
    return b.components.length - a.components.length
  }

  return a.components.join(',') < b.components.join(',') ? -1 : 1
}

const ligatureBytes = ({ components, glyph }: Ligature) => {
  return struct([
    ['ligatureGlyph', u16(glyph)],
    ['componentCount', u16(components.length)],
    ['componentGlyphIds', concat(components.slice(1).map(u16))],
  ])
}

const ligatureSet = (ligatures: Ligature[]) => {
  const bodies = ligatures.toSorted(byPreference).map(ligatureBytes)
  const headerSize = 2 + bodies.length * 2
  const offsets = prefixSums(
    bodies.map(({ length }) => length),
    headerSize,
  )

  return concat([u16(bodies.length), ...offsets.slice(0, -1).map(u16), ...bodies])
}

const ligatureSubst = (ligatures: Ligature[]) => {
  const grouped = ligatures.reduce<Map<number, Ligature[]>>((map, ligature) => {
    const first = ligature.components[0]
    const list = map.get(first) ?? []
    list.push(ligature)
    map.set(first, list)
    return map
  }, new Map())
  const groups = [...grouped].toSorted(([a], [b]) => a - b)

  const sets = groups.map(([_, list]) => ligatureSet(list))
  const coverage = struct([
    ['coverageFormat', u16(1)],
    ['glyphCount', u16(groups.length)],
    ['glyphArray', concat(groups.map(([glyph]) => u16(glyph)))],
  ])
  const headerSize = 6 + sets.length * 2
  const setOffsets = prefixSums(
    sets.map(({ length }) => length),
    headerSize,
  )
  const coverageOffset = setOffsets.at(-1) ?? headerSize

  return concat([
    u16(1),
    u16(coverageOffset),
    u16(sets.length),
    ...setOffsets.slice(0, -1).map(u16),
    ...sets,
    coverage,
  ])
}

// one ccmp lookup of type 4 (ligature substitution) under the default script
export const buildGsub = (ligatures: Ligature[]) => {
  const subtable = ligatureSubst(ligatures)
  const lookup = struct([
    ['lookupType', u16(4)],
    ['lookupFlag', u16(0)],
    ['subTableCount', u16(1)],
    ['subtableOffset', u16(8)],
    ['subtable', subtable],
  ])
  const lookupList = struct([
    ['lookupCount', u16(1)],
    ['lookupOffset', u16(4)],
    ['lookup', lookup],
  ])
  const feature = struct([
    ['featureParamsOffset', u16(0)],
    ['lookupIndexCount', u16(1)],
    ['lookupListIndex', u16(0)],
  ])
  const featureList = struct([
    ['featureCount', u16(1)],
    ['featureTag', tag('ccmp')],
    ['featureOffset', u16(8)],
    ['feature', feature],
  ])
  const langSys = struct([
    ['lookupOrderOffset', u16(0)],
    ['requiredFeatureIndex', u16(0xffff)],
    ['featureIndexCount', u16(1)],
    ['featureIndex', u16(0)],
  ])
  const script = struct([
    ['defaultLangSysOffset', u16(4)],
    ['langSysCount', u16(0)],
    ['defaultLangSys', langSys],
  ])
  const scriptList = struct([
    ['scriptCount', u16(1)],
    ['scriptTag', tag('DFLT')],
    ['scriptOffset', u16(8)],
    ['script', script],
  ])

  return withSections(
    (offsetOf) =>
      struct([
        ['majorVersion', u16(1)],
        ['minorVersion', u16(0)],
        ['scriptListOffset', u16(offsetOf('scriptList'))],
        ['featureListOffset', u16(offsetOf('featureList'))],
        ['lookupListOffset', u16(offsetOf('lookupList'))],
      ]),
    [
      ['scriptList', scriptList],
      ['featureList', featureList],
      ['lookupList', lookupList],
    ],
  )
}
