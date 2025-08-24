import { FullTransactionsByAddressParams, IBlockchainService, TNetworkId } from '../interfaces'
import { differenceInYears, isAfter, isFuture, isValid, parseISO } from 'date-fns'

type TValidateFullTransactionsByAddressParams<
  N extends string,
  A extends TNetworkId
> = FullTransactionsByAddressParams & {
  service: IBlockchainService<N, A>
  supportedNetworksIds?: string[]
}

export class BSFullTransactionsByAddressHelper {
  static validateFullTransactionsByAddressParams<N extends string, A extends TNetworkId>(
    params: TValidateFullTransactionsByAddressParams<N, A>
  ) {
    if (!params.dateFrom) throw new Error('Missing dateFrom param')
    if (!params.dateTo) throw new Error('Missing dateTo param')

    const dateFrom = parseISO(params.dateFrom)
    const dateTo = parseISO(params.dateTo)

    if (!isValid(dateFrom)) throw new Error('Invalid dateFrom param')
    if (!isValid(dateTo)) throw new Error('Invalid dateTo param')
    if (isFuture(dateFrom) || isFuture(dateTo)) throw new Error('The dateFrom and/or dateTo are in future')
    if (isAfter(dateFrom, dateTo)) throw new Error('Invalid date order because dateFrom is greater than dateTo')
    if (differenceInYears(dateTo, dateFrom) >= 1) throw new Error('Date range greater than one year')

    if (typeof params.pageSize === 'number' && (isNaN(params.pageSize) || params.pageSize < 1 || params.pageSize > 500))
      throw new Error('Page size should be between 1 and 500')

    if (params.supportedNetworksIds && !params.supportedNetworksIds.includes(params.service.network.id))
      throw new Error('Network not supported')

    if (!params.service.validateAddress(params.address)) throw new Error('Invalid address param')
  }
}
