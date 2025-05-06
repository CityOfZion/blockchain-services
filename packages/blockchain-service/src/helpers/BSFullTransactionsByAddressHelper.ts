import { FullTransactionsByAddressParams } from '../interfaces'
import { differenceInYears, isAfter, isFuture, isValid, parseISO } from 'date-fns'

export class BSFullTransactionsByAddressHelper {
  static validateFullTransactionsByAddressParams(params: FullTransactionsByAddressParams) {
    if (!params.dateFrom) throw new Error('Missing dateFrom param')
    if (!params.dateTo) throw new Error('Missing dateTo param')

    const dateFrom = parseISO(params.dateFrom)
    const dateTo = parseISO(params.dateTo)

    if (!isValid(dateFrom)) throw new Error('Invalid dateFrom param')
    if (!isValid(dateTo)) throw new Error('Invalid dateTo param')
    if (isFuture(dateFrom) || isFuture(dateTo)) throw new Error('The dateFrom and/or dateTo are in future')
    if (isAfter(dateFrom, dateTo)) throw new Error('Invalid date order because dateFrom is greater than dateTo')
    if (differenceInYears(dateTo, dateFrom) >= 1) throw new Error('Date range greater than one year')
  }
}
