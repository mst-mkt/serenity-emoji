import { concat } from './bytes'

const EMPTY = new Uint8Array(0)

// zlib deflate via web standard API (works on both Workers and Node)
export const deflate = async (data: Uint8Array) => {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'))
  const compressed = await new Response(stream).arrayBuffer()

  return new Uint8Array(compressed)
}

// zlib inflate via web standard API; reads incrementally and aborts past limit to stop decompression bombs
export const inflate = async (data: Uint8Array<ArrayBuffer>, limit: number) => {
  const stream = new Response(data).body?.pipeThrough(new DecompressionStream('deflate'))
  const reader = stream?.getReader()
  if (reader === undefined) return EMPTY

  const read = () =>
    reader.read().catch((cause: unknown) => {
      throw new Error('inflate: corrupt zlib stream', { cause })
    })

  const readInto = async (acc: Uint8Array[], total: number): Promise<Uint8Array[]> => {
    const { done, value } = await read()
    if (done || value === undefined) return acc
    if (total + value.length > limit) {
      await reader.cancel()
      throw new Error('inflate: data exceeds expected size')
    }
    acc.push(value)
    return readInto(acc, total + value.length)
  }

  return concat(await readInto([], 0))
}
