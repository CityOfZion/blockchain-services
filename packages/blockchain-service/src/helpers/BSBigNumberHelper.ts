import BigNumber from 'bignumber.js'
import { BSError } from '../error'

export class BSBigNumber extends BigNumber {
  constructor(value: BigNumber.Value, base?: number) {
    if (BSBigNumber._isValueString(value) && BSBigNumber._isBaseNumber(base)) {
      super(value, base)
    } else {
      super(value)
    }
  }

  static _isValueString(value: BigNumber.Value): value is string {
    return typeof value === 'string'
  }

  static _isBaseNumber(base?: number): base is number {
    return typeof base === 'number'
  }

  static ensureNumber(value: number | string | bigint | undefined) {
    let bn: BigNumber

    try {
      bn = new BigNumber(value || 0)
    } catch {
      return 0
    }

    if (bn.isNaN()) return 0

    return bn.toNumber()
  }

  toBigInt() {
    return BigInt(this.toString())
  }

  protected _wrap(value: BigNumber): this {
    return new (this.constructor as any)(value) as this
  }

  plus(value: BigNumber.Value, base?: number): this {
    return this._wrap(
      BSBigNumber._isValueString(value) && BSBigNumber._isBaseNumber(base) ? super.plus(value, base) : super.plus(value)
    )
  }

  minus(value: BigNumber.Value, base?: number): this {
    return this._wrap(
      BSBigNumber._isValueString(value) && BSBigNumber._isBaseNumber(base)
        ? super.minus(value, base)
        : super.minus(value)
    )
  }

  multipliedBy(value: BigNumber.Value, base?: number): this {
    return this._wrap(
      BSBigNumber._isValueString(value) && BSBigNumber._isBaseNumber(base)
        ? super.multipliedBy(value, base)
        : super.multipliedBy(value)
    )
  }

  dividedBy(value: BigNumber.Value, base?: number): this {
    return this._wrap(
      BSBigNumber._isValueString(value) && BSBigNumber._isBaseNumber(base)
        ? super.dividedBy(value, base)
        : super.dividedBy(value)
    )
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

    try {
      if (!value || new BigNumber(value).isNaN()) {
        value = 0
      }
    } catch {
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
    try {
      if (!value || new BigNumber(value).isNaN()) {
        value = 0
      }
    } catch {
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
