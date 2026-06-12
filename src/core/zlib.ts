// zlib deflate via web standard API (works on both Workers and Node)
export const deflate = async (data: Uint8Array) => {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'))
  const compressed = await new Response(stream).arrayBuffer()

  return new Uint8Array(compressed)
}
