import { base64 } from '../../lib/base64'

const CHUNK_SIZE = 4096

// kitty graphics protocol (APC): base64 png in <=4096-byte chunks, m=1 until the final m=0
export const toKitty = (png: Uint8Array) => {
  const data = base64(png)
  const pieces = [...Array(Math.ceil(data.length / CHUNK_SIZE))].map((_, i) =>
    data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
  )

  return pieces
    .map((piece, index) => {
      const more = index < pieces.length - 1 ? 1 : 0
      const control = index === 0 ? `a=T,f=100,m=${more}` : `m=${more}`
      return `\x1b_G${control};${piece}\x1b\\`
    })
    .join('')
}
