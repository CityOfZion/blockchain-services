import BigNumber from 'bignumber.js'

export type TBSBigNumber = BigNumber

export const BSBigNumber = BigNumber

type TFormatNumberOptions = {
  decimals?: number
}

export class BSBigNumberHelper {
  static toDecimals(value: TBSBigNumber, decimals = 0) {
    return new BSBigNumber(value).shiftedBy(decimals).toString()
  }

  static toNumber(value: TBSBigNumber, decimals?: number): string {
    return typeof decimals === 'number' ? value.toFixed(decimals) : value.toFixed()
  }

  static fromNumber(value: string | number): TBSBigNumber {
    return new BSBigNumber(value)
  }

  static fromDecimals(value: string | number | TBSBigNumber, decimals = 0): TBSBigNumber {
    return new BSBigNumber(value).shiftedBy(-decimals)
  }

  static format(value?: string | number | TBSBigNumber, options?: TFormatNumberOptions) {
    const { decimals = 0 } = options || {}

    if (!value) return '0'

    if (typeof value === 'string') {
      value = value.replace(/,|\.\.|\.,/g, '.').replace(/^([^.]*\.)(.*)$/, function (_a, b, c) {
        return b + c.replace(/\./g, '')
      })
    }

    try {
      const bigValue = new BSBigNumber(value)
      if (bigValue.isNaN()) {
        return '0'
      }

      const formattedValue = bigValue.decimalPlaces(decimals, BSBigNumber.ROUND_DOWN)
      return formattedValue.toFixed()
    } catch {
      console.error('Invalid value provided to format:', value)

      return '0'
    }
  }
}
