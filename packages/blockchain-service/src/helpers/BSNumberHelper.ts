type FormatNumberOptions = {
  decimals?: number
  shouldRemoveLeadingZero?: boolean
  shouldRemoveTrailingZero?: boolean
}

export class BSNumberHelper {
  static readonly sciNotationRegex = /^[+-]?\d+(\.\d+)?e[+-]?\d+$/i

  static countDecimals(value: string | number) {
    const [, decimals] = value.toString().split('.')

    return decimals?.length ?? 0
  }

  static sanitizeCommasAndDotsInNumber(value: string) {
    let newValue = value.replace(/,|\.\.|\.,|,,/g, '.')
    const parts = newValue.split('.')

    if (parts.length > 2) newValue = `${parts[0]}.${parts.slice(1).join('')}`

    return newValue
  }

  static isSciNotationValue(value: string) {
    return BSNumberHelper.sciNotationRegex.test(value)
  }

  static convertSciNotationValueToString(value: number) {
    if (Math.abs(value) < 1.0) {
      const parts = value.toString().split('e-')
      const hasNegativeExponent = parts.length === 2

      if (hasNegativeExponent) {
        const negativeExponent = parseInt(parts[1], 10)

        value *= Math.pow(10, negativeExponent - 1)

        return `0.${'0'.repeat(negativeExponent - 1)}${value.toString().substring(2)}`
      }
    }

    return value.toString()
  }

  static removeLeadingZero(value: string) {
    return value.replace(/^0+(?!\.)/, '') || '0'
  }

  static removeTrailingZero(value: string) {
    return value.replace(/(\.\d*?[1-9])0+$/g, '$1').replace(/\.0+$/, '')
  }

  static formatNumber(value?: string | number, options?: FormatNumberOptions) {
    if (!value) return '0'

    const { decimals = 0, shouldRemoveLeadingZero = true, shouldRemoveTrailingZero = true } = options ?? {}

    let newValue = typeof value === 'number' ? value.toString() : value.trim()

    newValue = BSNumberHelper.sanitizeCommasAndDotsInNumber(newValue)

    const newValueAsNumber = Number(newValue)

    if (isNaN(newValueAsNumber)) return '0'

    const isNegativeValue = newValue.startsWith('-')

    if (BSNumberHelper.isSciNotationValue(newValue))
      newValue = BSNumberHelper.convertSciNotationValueToString(newValueAsNumber)

    if (decimals === 0) newValue = newValue.split('.')[0]
    else {
      newValue = newValue.replace(/[^\d.]/g, '')

      const countedDecimals = BSNumberHelper.countDecimals(newValue)

      if (countedDecimals > decimals) newValue = newValue.slice(0, newValue.length - countedDecimals + decimals)
    }

    newValue = newValue.replace(/\s|-/g, '').replace(/^([^.]*\.)(.*)$/, (_a, b, c) => b + c.replace(/\./g, ''))

    if (shouldRemoveLeadingZero) newValue = BSNumberHelper.removeLeadingZero(newValue)
    if (shouldRemoveTrailingZero) newValue = BSNumberHelper.removeTrailingZero(newValue)
    if (newValue.startsWith('.')) newValue = `0${newValue}`
    if (newValue.endsWith('.')) newValue = newValue.slice(0, newValue.length - 1)
    if (!newValue) newValue = '0'
    if (newValue !== '0' && isNegativeValue) newValue = `-${newValue}`

    return newValue
  }
}
