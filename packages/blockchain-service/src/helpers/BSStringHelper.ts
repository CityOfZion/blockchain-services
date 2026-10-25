import type { TBSStringHelperRemoveSpecialCharacterOptions } from '../types'

export class BSStringHelper {
  static removeSpecialCharacters(text: string, options?: TBSStringHelperRemoveSpecialCharacterOptions) {
    options = { allowSpaces: true, trimText: false, ...options }

    let regex = 'a-zA-Z0-9'
    if (options.allowDots) {
      regex += '.'
    }

    if (options.allowSpaces) {
      regex += ' '
    }
    text = text.replace(new RegExp(`[^${regex}]`, 'g'), '')

    if (options.trimText) text = text.trim()

    return text
  }
}
