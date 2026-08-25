// Attribution for the upstream SerenityOS emoji artwork, redistributed under BSD-2-Clause.
const COPYRIGHT = 'Copyright (c) the SerenityOS developers'
const LICENSE = 'BSD-2-Clause'
const LICENSE_URL = 'https://github.com/SerenityOS/serenity/blob/master/LICENSE'
const SOURCE_URL = 'https://github.com/SerenityOS/serenity/tree/master/Base/res/emoji'

// RFC 8288 Link relation pointing at the upstream license text
export const licenseLink = () => `<${LICENSE_URL}>; rel="license"`

export const pngTextRecords = () => {
  return [
    ['Copyright', COPYRIGHT],
    ['License', LICENSE],
    ['Source', SOURCE_URL],
  ] as const
}

export const svgMetadata = () => `<metadata>${COPYRIGHT}. ${LICENSE}: ${LICENSE_URL}</metadata>`

// OpenType name records: 0 copyright, 13 license description, 14 license URL
export const fontNameRecords = () => {
  return [
    [0, COPYRIGHT],
    [13, `Licensed under ${LICENSE}. ${LICENSE_URL}`],
    [14, LICENSE_URL],
  ] as const
}
