import BigNumber from 'bignumber.js'

type FormatNumberOptions = {
  decimals?: number | string
}

export class BSBigNumberHelper {
  static #ensureNumber(value?: string | number): number {
    if (!value) return 0
    return +value || 0
  }

  static toDecimals(value: BigNumber, decimals?: number | string): string {
    const decimalsNumber = this.#ensureNumber(decimals)
    return new BigNumber(value).shiftedBy(decimalsNumber).toString()
  }

  static toNumber(value: BigNumber, decimals?: number | string): string {
    const decimalsNumber = this.#ensureNumber(decimals)
    return typeof decimals !== 'undefined' ? value.toFixed(decimalsNumber) : value.toFixed()
  }

  static fromNumber(value: string | number | undefined): BigNumber {
    return new BigNumber(value || 0)
  }

  static fromDecimals(value: string | number | undefined, decimals?: number | string): BigNumber {
    const decimalsNumber = this.#ensureNumber(decimals)
    return new BigNumber(value || 0).shiftedBy(-decimalsNumber)
  }

  static format(value?: string | number | BigNumber, options?: FormatNumberOptions) {
    const fixedDecimals = this.#ensureNumber(options?.decimals)

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

      const formattedValue = bigValue.decimalPlaces(fixedDecimals, BigNumber.ROUND_DOWN)
      return formattedValue.toFixed()
    } catch (error) {
      console.error(error)
      return '0'
    }
  }
}

export type TBSBigNumber = BigNumber

export const BSBigNumber = BigNumber
