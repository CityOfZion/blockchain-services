import type { ISwapService, TSwapServiceStatusResponse } from '@cityofzion/blockchain-service'
import { SimpleSwapApi } from './SimpleSwapApi'

export class SimpleSwapService<BSName extends string = string> implements ISwapService {
  #api: SimpleSwapApi<BSName>

  constructor() {
    this.#api = new SimpleSwapApi()
  }

  async getStatus(id: string): Promise<TSwapServiceStatusResponse> {
    const response = await this.#api.getExchange(id)

    const statusBySimpleSwapStatus: Record<string, TSwapServiceStatusResponse['status']> = {
      waiting: 'confirming',
      confirming: 'confirming',
      exchanging: 'exchanging',
      sending: 'exchanging',
      verifying: 'exchanging',
      finished: 'finished',
      expired: 'failed',
      failed: 'failed',
      refunded: 'refunded',
    }

    const status = statusBySimpleSwapStatus[response.status]

    return {
      status,
      txFrom: response.txFrom,
      txTo: response.txTo,
      log: response.log,
    }
  }
}
