import type { IWalletConnectService, TWalletConnectServiceRequestMethodParams } from '@cityofzion/blockchain-service'
import type { IBSBitcoin } from '../../types'

// TODO: implement this class
export class WalletConnectServiceBitcoin<N extends string> implements IWalletConnectService<N> {
  readonly #service: IBSBitcoin<N>

  namespace = ''
  chain = ''
  supportedMethods: string[] = []
  supportedEvents: string[] = []
  calculableMethods: string[] = []
  autoApproveMethods: string[] = []

  constructor(service: IBSBitcoin<N>) {
    this.#service = service

    // TODO: remove it
    console.log(this.#service)
  }

  // TODO: implement this method
  calculateRequestFee(_args: TWalletConnectServiceRequestMethodParams<N>): Promise<string> {
    throw new Error('Not implemented yet')
  }
}
