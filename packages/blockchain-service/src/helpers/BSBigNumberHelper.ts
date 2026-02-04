import BigNumber from 'bignumber.js'
import { TBSBigNumberHelperFormatOptions } from '../types'

export type TBSBigNumber = BigNumber

export const BSBigNumber = BigNumber

export class BSBigNumberHelper {
  static #ensureDecimals(value: string | number | undefined): number {
    if (!value) return 0

    value = +value || 0

    return 0 > value ? 0 : value
  }

  static toDecimals(value: TBSBigNumber, decimals: number | string): string {
    const decimalsNumber = this.#ensureDecimals(decimals)

    return new BSBigNumber(value).shiftedBy(decimalsNumber).toString()
  }

  static toNumber(value: TBSBigNumber, decimals?: number | string): string {
    const decimalsNumber = this.#ensureDecimals(decimals)

    return typeof decimals === 'number' || typeof decimals === 'string'
      ? value.toFixed(decimalsNumber)
      : value.toFixed()
  }

  static fromNumber(value: string | number | bigint | undefined): TBSBigNumber {
    return new BSBigNumber(value || 0)
  }

  static fromDecimals(
    value: string | number | bigint | TBSBigNumber | undefined,
    decimals: number | string
  ): TBSBigNumber {
    const decimalsNumber = this.#ensureDecimals(decimals)

    return new BSBigNumber(value || 0).shiftedBy(-decimalsNumber)
  }

  static format(value: string | number | bigint | TBSBigNumber | undefined, options?: TBSBigNumberHelperFormatOptions) {
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

      const decimals = this.#ensureDecimals(options?.decimals)
      const formattedValue = bigValue.decimalPlaces(decimals, BSBigNumber.ROUND_DOWN)

      return formattedValue.toFixed()
    } catch (error) {
      console.error(error)

      return '0'
    }
  }
}
