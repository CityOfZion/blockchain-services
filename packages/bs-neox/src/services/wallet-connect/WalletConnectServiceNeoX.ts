import {
  IWalletConnectService,
  TBSNetworkId,
  TWalletConnectServiceRequestMethodParams,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { IBSEthereum, WalletConnectServiceEthereum } from '@cityofzion/bs-ethereum'

export class WalletConnectServiceNeoX<N extends string, A extends TBSNetworkId>
  extends WalletConnectServiceEthereum<N, A>
  implements IWalletConnectService
{
  constructor(service: IBSEthereum<N, A>) {
    super(service)

    this.supportedMethods.push('eth_getTransactionCount', 'eth_getCachedTransaction')
  }

  async eth_getTransactionCount(args: TWalletConnectServiceRequestMethodParams<N>): Promise<number> {
    const { wallet } = await this._resolveParams(args)

    return await wallet.getTransactionCount()
  }

  async eth_getCachedTransaction(
    args: TWalletConnectServiceRequestMethodParams<N>
  ): Promise<ethers.providers.TransactionResponse> {
    const { provider } = await this._resolveParams(args)

    return await provider.getTransaction(args.params[0])
  }
}
