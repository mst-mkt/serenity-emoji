import { concat } from '../../decode/bytes'
import type { Ligature } from '../plan'
import { prefixSums, tag, u16 } from '../write'

const GSUB_HEADER_SIZE = 10

// longer sequences first, so extended sequences win over their prefixes
const byPreference = (a: Ligature, b: Ligature) => {
  if (a.components.length !== b.components.length) {
    return b.components.length - a.components.length
  }

  return a.components.join(',') < b.components.join(',') ? -1 : 1
}

const ligatureBytes = ({ components, glyph }: Ligature) => {
  return concat([u16(glyph), u16(components.length), ...components.slice(1).map(u16)])
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
  const coverage = concat([u16(1), u16(groups.length), ...groups.map(([glyph]) => u16(glyph))])
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
  const lookup = concat([u16(4), u16(0), u16(1), u16(8), subtable])
  const lookupList = concat([u16(1), u16(4), lookup])
  const feature = concat([u16(0), u16(1), u16(0)])
  const featureList = concat([u16(1), tag('ccmp'), u16(8), feature])
  const langSys = concat([u16(0), u16(0xffff), u16(1), u16(0)])
  const script = concat([u16(4), u16(0), langSys])
  const scriptList = concat([u16(1), tag('DFLT'), u16(8), script])

  return concat([
    u16(1),
    u16(0),
    u16(GSUB_HEADER_SIZE),
    u16(GSUB_HEADER_SIZE + scriptList.length),
    u16(GSUB_HEADER_SIZE + scriptList.length + featureList.length),
    scriptList,
    featureList,
    lookupList,
  ])
}
