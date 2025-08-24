import BigNumber from 'bignumber.js'

type FormatNumberOptions = {
  decimals?: number
}

export class BSBigNumberHelper {
  static toDecimals(value: BigNumber, decimals = 0) {
    return new BigNumber(value).shiftedBy(decimals).toString()
  }

  static toNumber(value: BigNumber): string {
    return value.toFixed()
  }

  static fromNumber(value: string | number): BigNumber {
    return new BigNumber(value)
  }

  static fromDecimals(value: string | number, decimals = 0): BigNumber {
    return new BigNumber(value).shiftedBy(-decimals)
  }

  static format(value?: string | number | BigNumber, options?: FormatNumberOptions) {
    const { decimals = 0 } = options || {}

    if (!value) return '0'

    if (typeof value === 'string') {
      value = value.replace(/,|\.\.|\.,/g, '.').replace(/^([^.]*\.)(.*)$/, function (_a, b, c) {
        return b + c.replace(/\./g, '')
      })
    }

    try {
      const bigValue = new BigNumber(value)
      if (bigValue.isNaN()) {
        return '0'
      }

      const formattedValue = bigValue.decimalPlaces(decimals, BigNumber.ROUND_DOWN)
      return formattedValue.toFixed()
    } catch (error) {
      console.error('Invalid value provided to format:', value)
      return '0'
    }
  }
}
