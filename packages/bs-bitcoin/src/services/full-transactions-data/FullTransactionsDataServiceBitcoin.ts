import type {
  IFullTransactionsDataService,
  TExportFullTransactionsByAddressParams,
  TGetFullTransactionsByAddressParams,
  TGetTransactionsByAddressResponse,
} from '@cityofzion/blockchain-service'
import type { IBSBitcoin } from '../../types'

// TODO: implement this class
export class FullTransactionsDataServiceBitcoin<N extends string> implements IFullTransactionsDataService<N> {
  readonly #service: IBSBitcoin<N>

  constructor(service: IBSBitcoin<N>) {
    this.#service = service

    // TODO: remove it
    console.log(this.#service)
  }

  // TODO: implement this method
  async getFullTransactionsByAddress(
    _params: TGetFullTransactionsByAddressParams
  ): Promise<TGetTransactionsByAddressResponse<N>> {
    throw new Error('Not implemented yet')
  }

  // TODO: implement this method
  async exportFullTransactionsByAddress(_params: TExportFullTransactionsByAddressParams): Promise<string> {
    throw new Error('Not implemented yet')
  }
}
