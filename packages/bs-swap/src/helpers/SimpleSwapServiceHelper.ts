import { SwapServiceHelper, SwapServiceStatusResponse } from '@cityofzion/blockchain-service'
import { SimpleSwapApi } from '../apis/SimpleSwapApi'

export class SimpleSwapServiceHelper<BSName extends string = string> implements SwapServiceHelper {
  #api: SimpleSwapApi<BSName>

  constructor() {
    this.#api = new SimpleSwapApi()
  }

  async getStatus(id: string): Promise<SwapServiceStatusResponse> {
    const response = await this.#api.getExchange(id)

    const statusBySimpleSwapStatus: Record<string, SwapServiceStatusResponse['status']> = {
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
    }
  }
}
