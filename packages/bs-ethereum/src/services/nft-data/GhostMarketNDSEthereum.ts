import {
  GhostMarketNDS,
  type TBSNetworkId,
  type THasTokenParams,
  type TBSBigNumber,
} from '@cityofzion/blockchain-service'

import type { IBSEthereum, TBSEthereumNetworkId } from '../../types'
import { ethers } from 'ethers'
import { ERC20_ABI } from '../../assets/abis/ERC20'

export class GhostMarketNDSEthereum<N extends string, A extends TBSNetworkId> extends GhostMarketNDS<
  N,
  A,
  IBSEthereum<N, A>
> {
  static readonly CHAIN_BY_NETWORK_ID: Partial<Record<TBSEthereumNetworkId, string>> = {
    '1': 'eth',
    '56': 'bsc',
    '137': 'polygon',
    '43114': 'avalanche',
    '8453': 'base',
  }

  constructor(service: IBSEthereum<N, A>) {
    super(service)
  }

  async hasToken({ address, collectionHash }: THasTokenParams): Promise<boolean> {
    try {
      if (!collectionHash) return false

      const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)
      const contract = new ethers.Contract(collectionHash, ERC20_ABI, provider)
      const response = await contract.balanceOf(address)

      if (!response) return false

      const parsedResponse = response as TBSBigNumber

      return parsedResponse.gt(0)
    } catch {
      return false
    }
  }

  getChain(): string {
    const chain = GhostMarketNDSEthereum.CHAIN_BY_NETWORK_ID[this._service.network.id]
    if (!chain) throw new Error('Network not supported')
    return chain
  }
}
