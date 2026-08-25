declare module 'emoji-name-map' {
  const emojiNameMap: {
    emoji: Record<string, string>
    get: (name: string) => unknown
  }
  export default emojiNameMap
}
