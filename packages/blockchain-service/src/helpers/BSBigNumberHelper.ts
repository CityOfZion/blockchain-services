import BigNumber from 'bignumber.js'
import { BSError } from '../error'

export class BSBigNumber extends BigNumber {
  constructor(value: BigNumber.Value, base?: number) {
    super(value, base)
  }

  static ensureNumber(value: number | string | bigint | undefined) {
    const bn = new BigNumber(value || 0)
    if (bn.isNaN()) {
      return 0
    }

    return bn.toNumber()
  }

  toBigInt() {
    return BigInt(this.toString())
  }

  protected _wrap(value: BigNumber): this {
    return new (this.constructor as any)(value) as this
  }

  plus(n: BigNumber.Value, base?: number): this {
    return this._wrap(super.plus(n, base))
  }

  minus(n: BigNumber.Value, base?: number): this {
    return this._wrap(super.minus(n, base))
  }

  multipliedBy(n: BigNumber.Value, base?: number): this {
    return this._wrap(super.multipliedBy(n, base))
  }

  dividedBy(n: BigNumber.Value, base?: number): this {
    return this._wrap(super.dividedBy(n, base))
  }

  integerValue(roundingMode?: BigNumber.RoundingMode): this {
    return this._wrap(super.integerValue(roundingMode))
  }
}

export class BSBigHumanAmount extends BSBigNumber {
  decimals?: number

  constructor(value: BigNumber.Value | undefined | null, decimals?: number | string) {
    if (typeof value === 'string') {
      value = value.replace(/,|\.\.|\.,/g, '.').replace(/^([^.]*\.)(.*)$/, function (_a, b, c) {
        return b + c.replace(/\./g, '')
      })
    }

    if (!value || new BigNumber(value).isNaN()) {
      value = 0
    }

    super(value)

    this.decimals = decimals !== undefined ? BSBigNumber.ensureNumber(decimals) : undefined
  }

  protected _wrap(value: BigNumber): this {
    return new (this.constructor as any)(value, this.decimals) as this
  }

  toFormatted() {
    return this.decimalPlaces(this.decimals ?? 0, BigNumber.ROUND_DOWN).toFixed()
  }

  toUnit() {
    if (typeof this.decimals !== 'number') {
      throw new BSError('Decimals property is required to convert to Unit', 'DECIMALS_REQUIRED')
    }

    const shifted = this.shiftedBy(this.decimals)
    return new BSBigUnitAmount(shifted, this.decimals)
  }
}

export class BSBigUnitAmount extends BSBigNumber {
  decimals?: number

  constructor(value: BigNumber.Value | undefined | null, decimals: number | string) {
    if (!value || new BigNumber(value).isNaN()) {
      value = 0
    }

    super(value)

    this.decimals = BSBigNumber.ensureNumber(decimals)
  }

  protected _wrap(value: BigNumber): this {
    return new (this.constructor as any)(value, this.decimals) as this
  }

  toHuman() {
    const shifted = this.shiftedBy(-this.decimals!)
    return new BSBigHumanAmount(shifted, this.decimals)
  }
}
