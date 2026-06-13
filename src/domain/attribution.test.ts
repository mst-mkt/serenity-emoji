import { describe, expect, it } from 'vite-plus/test'

import { fontNameRecords, licenseLink, pngTextRecords, svgMetadata } from './attribution'

describe('licenseLink', () => {
  it('points a license link relation at the upstream license', () => {
    const link = licenseLink()

    expect(link).toBe('<https://github.com/SerenityOS/serenity/blob/master/LICENSE>; rel="license"')
  })
})

describe('pngTextRecords', () => {
  it('declares copyright, license and source under registered keywords', () => {
    const records = new Map(pngTextRecords())

    expect(records.get('Copyright')).toBe('Copyright (c) the SerenityOS developers')
    expect(records.get('License')).toBe('BSD-2-Clause')
    expect(records.get('Source')).toContain('SerenityOS/serenity')
  })
})

describe('svgMetadata', () => {
  it('wraps the copyright and license in a metadata element', () => {
    const metadata = svgMetadata()

    expect(metadata.startsWith('<metadata>')).toBe(true)
    expect(metadata.endsWith('</metadata>')).toBe(true)
    expect(metadata).toContain('BSD-2-Clause')
  })
})

describe('fontNameRecords', () => {
  it('maps the copyright and license name ids', () => {
    const records = new Map(fontNameRecords())

    expect(records.get(0)).toBe('Copyright (c) the SerenityOS developers')
    expect(records.get(13)).toContain('BSD-2-Clause')
    expect(records.get(14)).toBe('https://github.com/SerenityOS/serenity/blob/master/LICENSE')
  })
})
