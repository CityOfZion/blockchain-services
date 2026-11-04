import type { TGetFullTransactionsByAddressParams, IBlockchainService, TBSNetworkId } from '../interfaces'
import { addYears, isAfter, isFuture, isValid, parseISO } from 'date-fns'
import { BSError } from '../error'

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
    if (!params.dateFrom) throw new BSError('Missing dateFrom param', 'MISSING_DATE_FROM')
    if (!params.dateTo) throw new BSError('Missing dateTo param', 'MISSING_DATE_TO')

    const dateFrom = parseISO(params.dateFrom)
    const dateTo = parseISO(params.dateTo)

    if (!isValid(dateFrom)) throw new BSError('Invalid dateFrom param', 'INVALID_DATE_FROM')
    if (!isValid(dateTo)) throw new BSError('Invalid dateTo param', 'INVALID_DATE_TO')

    if (isFuture(dateFrom) || isFuture(dateTo)) {
      throw new BSError('The dateFrom and/or dateTo are in future', 'DATE_IN_FUTURE')
    }

    if (isAfter(dateFrom, dateTo)) {
      throw new BSError('Invalid date order because dateFrom is greater than dateTo', 'INVALID_DATE_ORDER')
    }

    if (isAfter(dateTo, addYears(dateFrom, 1))) {
      throw new BSError('Date range greater than one year', 'DATE_RANGE_TOO_LARGE')
    }

    const maxPageSize = params.maxPageSize ?? 500

    if (
      typeof params.pageSize === 'number' &&
      (isNaN(params.pageSize) || params.pageSize < 1 || params.pageSize > maxPageSize)
    ) {
      throw new BSError(`Page size should be between 1 and ${maxPageSize}`, 'INVALID_PAGE_SIZE')
    }

    if (params.supportedNetworksIds && !params.supportedNetworksIds.includes(params.service.network.id)) {
      throw new BSError('Network not supported', 'NETWORK_NOT_SUPPORTED')
    }

    if (!params.service.validateAddress(params.address)) throw new BSError('Invalid address param', 'INVALID_ADDRESS')
  }
}
