import { buildFontSubsets } from '../fonts/build-fonts'
import { getFontBuilt, getFontTarget } from '../storage/fonts'

export const build = async () => {
  const [target, built] = await Promise.all([getFontTarget(), getFontBuilt()])

  const needsBuild = target !== null && target !== built
  if (!needsBuild) return

  await buildFontSubsets(target)
}
