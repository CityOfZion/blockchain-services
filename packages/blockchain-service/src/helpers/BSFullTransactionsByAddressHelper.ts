import type { TGetFullTransactionsByAddressParams, IBlockchainService, TBSNetworkId } from '../interfaces'
import { addYears, isAfter, isFuture, isValid, parseISO } from 'date-fns'

type TValidateFullTransactionsByAddressParams<
  N extends string,
  A extends TBSNetworkId,
> = TGetFullTransactionsByAddressParams & {
  service: IBlockchainService<N, A>
  supportedNetworksIds?: string[]
  maxPageSize?: number
}

export class BSFullTransactionsByAddressHelper {
  static validateFullTransactionsByAddressParams<N extends string, A extends TBSNetworkId>(
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
    if (isAfter(dateTo, addYears(dateFrom, 1))) throw new Error('Date range greater than one year')

    const maxPageSize = params.maxPageSize ?? 500

    if (
      typeof params.pageSize === 'number' &&
      (isNaN(params.pageSize) || params.pageSize < 1 || params.pageSize > maxPageSize)
    )
      throw new Error(`Page size should be between 1 and ${maxPageSize}`)

    if (params.supportedNetworksIds && !params.supportedNetworksIds.includes(params.service.network.id))
      throw new Error('Network not supported')

    if (!params.service.validateAddress(params.address)) throw new Error('Invalid address param')
  }
}
