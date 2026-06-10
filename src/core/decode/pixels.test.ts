import { describe, expect, it } from 'vite-plus/test'

import { rgba } from '../fixtures.ts'
import { toPixels } from './pixels.ts'

const meta = { width: 2, depth: 8, channels: 4, palette: undefined, transparencyKey: undefined }

describe('toPixels', () => {
  it('keeps RGBA samples including alpha', () => {
    const lines = [Uint8Array.from([255, 0, 0, 255, 0, 255, 0, 0])]

    const pixels = toPixels(meta, lines)

    expect(pixels).toEqual([[rgba(255, 0, 0, 255), rgba(0, 255, 0, 0)]])
  })

  it('expands gray + alpha to rgba', () => {
    const lines = [Uint8Array.from([128, 255, 64, 0])]

    const pixels = toPixels({ ...meta, channels: 2 }, lines)

    expect(pixels).toEqual([[rgba(128, 128, 128, 255), rgba(64, 64, 64, 0)]])
  })

  it('keeps RGB always opaque', () => {
    const lines = [Uint8Array.from([255, 0, 0, 0, 255, 0])]

    const pixels = toPixels({ ...meta, channels: 3 }, lines)

    expect(pixels).toEqual([[rgba(255, 0, 0, 255), rgba(0, 255, 0, 255)]])
  })

  it('maps RGB pixels matching the key to alpha 0', () => {
    const lines = [Uint8Array.from([255, 0, 0, 0, 255, 0])]

    const pixels = toPixels({ ...meta, channels: 3, transparencyKey: [0, 255, 0] }, lines)

    expect(pixels).toEqual([[rgba(255, 0, 0, 255), rgba(0, 255, 0, 0)]])
  })

  it('scales gray samples to 0-255', () => {
    const lines = [Uint8Array.from([0b11_01_00_00])]

    const pixels = toPixels({ ...meta, depth: 2, channels: 1 }, lines)

    expect(pixels).toEqual([[rgba(255, 255, 255, 255), rgba(85, 85, 85, 255)]])
  })

  it('maps gray samples matching the key to alpha 0', () => {
    const lines = [Uint8Array.from([0, 128])]

    const pixels = toPixels({ ...meta, channels: 1, transparencyKey: [0] }, lines)

    expect(pixels).toEqual([[rgba(0, 0, 0, 0), rgba(128, 128, 128, 255)]])
  })

  it('resolves palette indexes to colors', () => {
    const palette = [
      [0, 0, 0, 0],
      [255, 0, 0, 255],
    ]
    const lines = [Uint8Array.from([0, 1])]

    const pixels = toPixels({ ...meta, channels: 1, palette }, lines)

    expect(pixels).toEqual([[rgba(0, 0, 0, 0), rgba(255, 0, 0, 255)]])
  })

  it('unpacks depth 2 palette bits', () => {
    const palette = [
      [0, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
    ]
    const lines = [Uint8Array.from([0b00_01_10_11])]

    const pixels = toPixels({ ...meta, width: 4, depth: 2, channels: 1, palette }, lines)

    expect(pixels).toEqual([
      [rgba(0, 0, 0, 255), rgba(255, 0, 0, 255), rgba(0, 255, 0, 255), rgba(0, 0, 255, 255)],
    ])
  })

  it('throws on unsupported channel counts', () => {
    const fiveChannels = { ...meta, channels: 5 }

    expect(() => toPixels(fiveChannels, [])).toThrow('unsupported png: 5 channels')
  })

  it('throws on sub-byte depths for multi-channel pixels', () => {
    const packed = { ...meta, depth: 4, channels: 3 }

    expect(() => toPixels(packed, [])).toThrow('unsupported png: bit depth 4 for 3 channels')
  })

  it('throws on out-of-range palette indexes', () => {
    const palette = [
      [0, 0, 0, 0],
      [255, 0, 0, 255],
    ]
    const lines = [Uint8Array.from([0, 2])]

    expect(() => toPixels({ ...meta, channels: 1, palette }, lines)).toThrow(
      'palette index 2 out of range',
    )
  })
})
