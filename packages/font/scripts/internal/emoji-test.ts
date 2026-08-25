// parses Unicode emoji-test.txt into codepoint -> group; used by gen-emoji-groups.ts
const VARIATION_SELECTOR = 0xfe0f
const SECTION_SEPARATOR = '\n# group: '

const isCommentLine = (line: string) => line.trimStart().startsWith('#')

// "Smileys & Emotion" -> "smileys-emotion"; non-alphanumerics collapse to one dash
const slugify = (name: string) => {
  const normalized = name
    .toLowerCase()
    .split('')
    .map((char) => {
      const isAlnum = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9')
      return isAlnum ? char : ' '
    })

  return normalized
    .join('')
    .split(' ')
    .filter((part) => part.length > 0)
    .join('-')
}

// drop VS16 so a VS16 emoji reduces to its base codepoint
const baseCodePointsOf = (line: string) => {
  const codePointsField = line.split(';')[0] ?? ''
  const codePoints = codePointsField
    .trim()
    .split(' ')
    .filter((part) => part.length > 0)
    .map((hex) => Number.parseInt(hex, 16))

  return codePoints.filter((codePoint) => codePoint !== VARIATION_SELECTOR)
}

const groupEntriesOf = (section: string) => {
  const [header, ...lines] = section.split('\n')
  const group = slugify(header)

  return lines
    .filter((line) => !isCommentLine(line) && line.trim().length > 0)
    .map(baseCodePointsOf)
    .filter((base) => base.length === 1)
    .map((base): [number, string] => [base[0], group])
}

// sections start after each "# group:" header; the leading split chunk is the preamble
export const parseEmojiGroups = (text: string) => {
  const sections = `\n${text}`.split(SECTION_SEPARATOR).slice(1)

  return new Map(sections.flatMap(groupEntriesOf))
}

const VERSION_MARKER = '# Version:'

export const parseEmojiVersion = (text: string) => {
  const line = text.split('\n').find((candidate) => candidate.startsWith(VERSION_MARKER))

  return line?.slice(VERSION_MARKER.length).trim() ?? 'unknown'
}
