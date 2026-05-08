import { ERC20_ABI } from '@cityofzion/bs-ethereum'
import { BSBigUnitAmount, GhostMarketNDS, type THasTokenParams } from '@cityofzion/blockchain-service'
import { ethers, JsonRpcProvider } from 'ethers'
import type { IBSNeoX, TBSNeoXName, TBSNeoXNetworkId } from '../../types'

export class GhostMarketNDSNeoX extends GhostMarketNDS<TBSNeoXName, TBSNeoXNetworkId, IBSNeoX> {
  static readonly CHAIN_BY_NETWORK_ID: Partial<Record<TBSNeoXNetworkId, string>> = {
    '47763': 'neox',
  }

  constructor(service: IBSNeoX) {
    super(service)
  }

  async hasToken({ address, collectionHash }: THasTokenParams): Promise<boolean> {
    try {
      if (!collectionHash) return false

      const provider = new JsonRpcProvider(this._service.network.url)
      const contract = new ethers.Contract(collectionHash, ERC20_ABI, provider)
      const response = await contract.balanceOf(address)

      if (!response) return false

      return new BSBigUnitAmount(response.toString(), 0).isGreaterThan(0)
    } catch {
      return false
    }
  }

  getChain(): string {
    const chain = GhostMarketNDSNeoX.CHAIN_BY_NETWORK_ID[this._service.network.id]
    if (!chain) throw new Error('Network not supported')
    return chain
  }
}
