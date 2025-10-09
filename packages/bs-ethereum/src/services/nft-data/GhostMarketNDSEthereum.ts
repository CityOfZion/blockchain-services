import { TBSNetworkId, GhostMarketNDS, THasTokenParam } from '@cityofzion/blockchain-service'

import { IBSEthereum, TBSEthereumNetworkId } from '../../types'
import { ethers } from 'ethers'
import { ERC20_ABI } from '../../assets/abis/ERC20'

export class GhostMarketNDSEthereum<N extends string, A extends TBSNetworkId> extends GhostMarketNDS {
  static readonly CHAIN_BY_NETWORK_ID: Partial<Record<TBSEthereumNetworkId, string>> = {
    '1': 'eth',
    '56': 'bsc',
    '137': 'polygon',
    '43114': 'avalanche',
    '8453': 'base',
  }

  _service: IBSEthereum<N, A>

  constructor(service: IBSEthereum<N, A>) {
    super()

    this._service = service
  }

  async hasToken({ collectionHash, address }: THasTokenParam): Promise<boolean> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(this._service.network.url)
      const contract = new ethers.Contract(collectionHash, ERC20_ABI, provider)
      const response = await contract.balanceOf(address)
      if (!response) throw new Error()
      const parsedResponse = response as BigNumber
      return parsedResponse.gt(0)
    } catch {
      throw new Error(`Token not found: ${collectionHash}`)
    }
  }

  getChain(): string {
    const chain = GhostMarketNDSEthereum.CHAIN_BY_NETWORK_ID[this._service.network.id]
    if (!chain) throw new Error('Network not supported')
    return chain
  }
}
