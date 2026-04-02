import { BSBigNumber, BSBigHumanAmount, BSBigUnitAmount } from '../helpers/BSBigNumberHelper'

describe('BSBigNumber', () => {
  it('Should return the number when a valid value is provided to ensureNumber', () => {
    expect(BSBigNumber.ensureNumber(10)).toBe(10)
    expect(BSBigNumber.ensureNumber('3.14')).toBe(3.14)
    expect(BSBigNumber.ensureNumber(0)).toBe(0)
    expect(BSBigNumber.ensureNumber(BigInt(42))).toBe(42)
  })

  it('Should return 0 for invalid values in ensureNumber', () => {
    expect(BSBigNumber.ensureNumber(undefined)).toBe(0)
    expect(BSBigNumber.ensureNumber('abc')).toBe(0)
  })

  it('Should convert to BigInt', () => {
    expect(new BSBigNumber(10).toBigInt()).toBe(BigInt(10))
    expect(new BSBigNumber(0).toBigInt()).toBe(BigInt(0))
  })

  it('Should return BSBigNumber instances from arithmetic operations', () => {
    const plus = new BSBigNumber(1).plus(2)
    expect(plus).toBeInstanceOf(BSBigNumber)
    expect(plus.toNumber()).toBe(3)

    const minus = new BSBigNumber(5).minus(3)
    expect(minus).toBeInstanceOf(BSBigNumber)
    expect(minus.toNumber()).toBe(2)

    const multiplied = new BSBigNumber(4).multipliedBy(3)
    expect(multiplied).toBeInstanceOf(BSBigNumber)
    expect(multiplied.toNumber()).toBe(12)

    const divided = new BSBigNumber(10).dividedBy(2)
    expect(divided).toBeInstanceOf(BSBigNumber)
    expect(divided.toNumber()).toBe(5)

    const integer = new BSBigNumber(3.7).integerValue()
    expect(integer).toBeInstanceOf(BSBigNumber)
    expect(integer.toNumber()).toBe(4)
  })
})

describe('BSBigHumanAmount', () => {
  it('Should format the numbers with decimals', () => {
    expect(new BSBigHumanAmount(1, 24).toFormatted()).toBe('1')
    expect(new BSBigHumanAmount(1.23, 24).toFormatted()).toBe('1.23')
    expect(new BSBigHumanAmount(0.31, 24).toFormatted()).toBe('0.31')
    expect(new BSBigHumanAmount(0.0031, 24).toFormatted()).toBe('0.0031')
    expect(new BSBigHumanAmount(0.888, 24).toFormatted()).toBe('0.888')
    expect(new BSBigHumanAmount(0.0000005, 24).toFormatted()).toBe('0.0000005')
    expect(new BSBigHumanAmount('51.6560056', 24).toFormatted()).toBe('51.6560056')
    expect(new BSBigHumanAmount('000.2323230000', 24).toFormatted()).toBe('0.232323')
    expect(new BSBigHumanAmount('003451.44444400', 24).toFormatted()).toBe('3451.444444')
    expect(new BSBigHumanAmount('00345.1.44444400000000000000000000000000000000000000000', 24).toFormatted()).toBe(
      '345.1444444'
    )
    expect(new BSBigHumanAmount('00345.1.44444400000000000000000000000000000000000000020', 24).toFormatted()).toBe(
      '345.1444444'
    )
    expect(new BSBigHumanAmount('00345.1.44444400000200000000000000000000000000000000020', 24).toFormatted()).toBe(
      '345.1444444000002'
    )
    expect(new BSBigHumanAmount('00345.1.1444444000000000000000210000000000000000020', 24).toFormatted()).toBe(
      '345.114444440000000000000002'
    )
    expect(new BSBigHumanAmount('23,2323,2323000', 24).toFormatted()).toBe('23.23232323')
    expect(new BSBigHumanAmount('00.1', 24).toFormatted()).toBe('0.1')
    expect(new BSBigHumanAmount('.1', 24).toFormatted()).toBe('0.1')
    expect(new BSBigHumanAmount('231.', 24).toFormatted()).toBe('231')
    expect(new BSBigHumanAmount('.1.', 24).toFormatted()).toBe('0.1')
    expect(new BSBigHumanAmount('4', 24).toFormatted()).toBe('4')
    expect(new BSBigHumanAmount('12asdasd312', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(0, 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('.', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('2.2', 24).toFormatted()).toBe('2.2')
    expect(new BSBigHumanAmount('.0', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('0.', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('1.', 24).toFormatted()).toBe('1')
    expect(new BSBigHumanAmount('00023.002323000000', 24).toFormatted()).toBe('23.002323')
    expect(new BSBigHumanAmount(undefined, 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(',', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(NaN, 24).toFormatted()).toBe('0')

    expect(new BSBigHumanAmount(-1, 24).toFormatted()).toBe('-1')
    expect(new BSBigHumanAmount(-1.23, 24).toFormatted()).toBe('-1.23')
    expect(new BSBigHumanAmount(-0.31, 24).toFormatted()).toBe('-0.31')
    expect(new BSBigHumanAmount(-0.0031, 24).toFormatted()).toBe('-0.0031')
    expect(new BSBigHumanAmount(-0.888, 24).toFormatted()).toBe('-0.888')
    expect(new BSBigHumanAmount(-0.0000005, 24).toFormatted()).toBe('-0.0000005')
    expect(new BSBigHumanAmount('-51.6560056', 24).toFormatted()).toBe('-51.6560056')
    expect(new BSBigHumanAmount('-000.2323230000', 24).toFormatted()).toBe('-0.232323')
    expect(new BSBigHumanAmount('-003451.44444400', 24).toFormatted()).toBe('-3451.444444')
    expect(new BSBigHumanAmount('-00345.1.44444400000000000000000000000000000000000000000', 24).toFormatted()).toBe(
      '-345.1444444'
    )
    expect(new BSBigHumanAmount('-00345.1.44444400000000000000000000000000000000000000020', 24).toFormatted()).toBe(
      '-345.1444444'
    )
    expect(new BSBigHumanAmount('-00345.1.44444400000200000000000000000000000000000000020', 24).toFormatted()).toBe(
      '-345.1444444000002'
    )
    expect(new BSBigHumanAmount('-00345.1.1444444000000000000000210000000000000000020', 24).toFormatted()).toBe(
      '-345.114444440000000000000002'
    )
    expect(new BSBigHumanAmount('-23,2323,2323000', 24).toFormatted()).toBe('-23.23232323')
    expect(new BSBigHumanAmount('-00.1', 24).toFormatted()).toBe('-0.1')
    expect(new BSBigHumanAmount('-.1', 24).toFormatted()).toBe('-0.1')
    expect(new BSBigHumanAmount('-231.', 24).toFormatted()).toBe('-231')
    expect(new BSBigHumanAmount('-.1.', 24).toFormatted()).toBe('-0.1')
    expect(new BSBigHumanAmount('-4', 24).toFormatted()).toBe('-4')
    expect(new BSBigHumanAmount('-12asdasd312', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(-0, 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-.', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-2.2', 24).toFormatted()).toBe('-2.2')
    expect(new BSBigHumanAmount('-.0', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-0.', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-1.', 24).toFormatted()).toBe('-1')
    expect(new BSBigHumanAmount('-00023.002323000000', 24).toFormatted()).toBe('-23.002323')
    expect(new BSBigHumanAmount(undefined, 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-,', 24).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(NaN, 24).toFormatted()).toBe('0')
  })

  it('Should format the numbers without decimals', () => {
    expect(new BSBigHumanAmount(1).toFormatted()).toBe('1')
    expect(new BSBigHumanAmount(1.23).toFormatted()).toBe('1')
    expect(new BSBigHumanAmount(0.31).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(0.0031).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(0.888).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(0.0000005).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('51.6560056').toFormatted()).toBe('51')
    expect(new BSBigHumanAmount('000.2323230000').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('003451.44444400').toFormatted()).toBe('3451')
    expect(new BSBigHumanAmount('00345.1.44444400000000000000000000000000000000000000000').toFormatted()).toBe('345')
    expect(new BSBigHumanAmount('00345.1.44444400000000000000000000000000000000000000020').toFormatted()).toBe('345')
    expect(new BSBigHumanAmount('00345.1.44444400000200000000000000000000000000000000020').toFormatted()).toBe('345')
    expect(new BSBigHumanAmount('00345.1.1444444000000000000000210000000000000000020').toFormatted()).toBe('345')
    expect(new BSBigHumanAmount('23,2323,2323000').toFormatted()).toBe('23')
    expect(new BSBigHumanAmount('00.1').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('.1').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('231.').toFormatted()).toBe('231')
    expect(new BSBigHumanAmount('.1.').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('4').toFormatted()).toBe('4')
    expect(new BSBigHumanAmount('12asdasd312').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(0).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('.').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('2.2').toFormatted()).toBe('2')
    expect(new BSBigHumanAmount('.0').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('0.').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('1.').toFormatted()).toBe('1')
    expect(new BSBigHumanAmount('00023.002323000000').toFormatted()).toBe('23')
    expect(new BSBigHumanAmount(undefined).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(',').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(NaN).toFormatted()).toBe('0')

    expect(new BSBigHumanAmount(-1).toFormatted()).toBe('-1')
    expect(new BSBigHumanAmount(-1.23).toFormatted()).toBe('-1')
    expect(new BSBigHumanAmount(-0.31).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(-0.0031).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(-0.888).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(-0.0000005).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-51.6560056').toFormatted()).toBe('-51')
    expect(new BSBigHumanAmount('-000.2323230000').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-003451.44444400').toFormatted()).toBe('-3451')
    expect(new BSBigHumanAmount('-00345.1.44444400000000000000000000000000000000000000000').toFormatted()).toBe('-345')
    expect(new BSBigHumanAmount('-00345.1.44444400000000000000000000000000000000000000020').toFormatted()).toBe('-345')
    expect(new BSBigHumanAmount('-00345.1.44444400000200000000000000000000000000000000020').toFormatted()).toBe('-345')
    expect(new BSBigHumanAmount('-00345.1.1444444000000000000000210000000000000000020').toFormatted()).toBe('-345')
    expect(new BSBigHumanAmount('-23,2323,2323000').toFormatted()).toBe('-23')
    expect(new BSBigHumanAmount('-00.1').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-.1').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-231.').toFormatted()).toBe('-231')
    expect(new BSBigHumanAmount('-.1.').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-4').toFormatted()).toBe('-4')
    expect(new BSBigHumanAmount('-12asdasd312').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(-0).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-.').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-2.2').toFormatted()).toBe('-2')
    expect(new BSBigHumanAmount('-.0').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-0.').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-1.').toFormatted()).toBe('-1')
    expect(new BSBigHumanAmount('-00023.002323000000').toFormatted()).toBe('-23')
    expect(new BSBigHumanAmount(undefined).toFormatted()).toBe('0')
    expect(new BSBigHumanAmount('-,').toFormatted()).toBe('0')
    expect(new BSBigHumanAmount(NaN).toFormatted()).toBe('0')
  })

  it('Should convert human amount to unit amount', () => {
    const human = new BSBigHumanAmount('1.5', 8)
    const unit = human.toUnit()
    expect(unit).toBeInstanceOf(BSBigUnitAmount)
    expect(unit.toNumber()).toBe(150000000)
  })

  it('Should throw when convert to unit and decimals is not defined', () => {
    const human = new BSBigHumanAmount('1.5')
    expect(() => human.toUnit()).toThrow('Decimals property is required to convert to Unit')
  })

  it('Should return BSBigHumanAmount instances and preserve decimals', () => {
    const a = new BSBigHumanAmount('10', 8)

    const plus = a.plus(5)
    expect(plus).toBeInstanceOf(BSBigHumanAmount)
    expect(plus.decimals).toBe(8)
    expect(plus.toFormatted()).toBe('15')

    const minus = a.minus(3)
    expect(minus).toBeInstanceOf(BSBigHumanAmount)
    expect(minus.toFormatted()).toBe('7')

    const multiplied = a.multipliedBy(2)
    expect(multiplied).toBeInstanceOf(BSBigHumanAmount)
    expect(multiplied.toFormatted()).toBe('20')

    const divided = a.dividedBy(4)
    expect(divided).toBeInstanceOf(BSBigHumanAmount)
    expect(divided.toFormatted()).toBe('2.5')
  })
})

describe('BSBigUnitAmount', () => {
  it('Should convert unit amount to human amount', () => {
    const unit = new BSBigUnitAmount(150000000, 8)
    const human = unit.toHuman()
    expect(human).toBeInstanceOf(BSBigHumanAmount)
    expect(human.toFormatted()).toBe('1.5')
    expect(human.decimals).toBe(8)
  })

  it('Should handle zero and invalid values', () => {
    expect(new BSBigUnitAmount(0, 8).toHuman().toFormatted()).toBe('0')
    expect(new BSBigUnitAmount(null, 8).toHuman().toFormatted()).toBe('0')
    expect(new BSBigUnitAmount(undefined, 8).toHuman().toFormatted()).toBe('0')
  })

  it('Should return BSBigUnitAmount instances from arithmetic operations', () => {
    const a = new BSBigUnitAmount(100, 8)

    const plus = a.plus(50)
    expect(plus).toBeInstanceOf(BSBigUnitAmount)
    expect(plus.decimals).toBe(8)
    expect(plus.toNumber()).toBe(150)

    const minus = a.minus(30)
    expect(minus).toBeInstanceOf(BSBigUnitAmount)
    expect(minus.toNumber()).toBe(70)
  })

  it('Should roundtrip human -> unit -> human', () => {
    const original = new BSBigHumanAmount('123.456789', 8)
    const unit = original.toUnit()
    const back = unit.toHuman()
    expect(back.toFormatted()).toBe('123.456789')
  })
})
