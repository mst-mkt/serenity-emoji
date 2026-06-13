export const isDigit = (char: string) => char >= '0' && char <= '9'

export const isHexChar = (char: string) => isDigit(char) || (char >= 'a' && char <= 'f')
