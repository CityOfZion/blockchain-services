import { BSError, GhostMarketNDS, type THasTokenParams } from '@cityofzion/blockchain-service'

import type { IBSNeo3, TBSNeo3Name, TBSNeo3NetworkId } from '../../types'
import { BSNeo3NeonDappKitSingletonHelper } from '../../helpers/BSNeo3NeonDappKitSingletonHelper'

export class GhostMarketNDSNeo3 extends GhostMarketNDS<TBSNeo3Name, TBSNeo3NetworkId, IBSNeo3> {
  static readonly CHAIN_BY_NETWORK_ID: Record<TBSNeo3NetworkId, string> = {
    mainnet: 'n3',
    testnet: 'n3t',
  }

  constructor(service: IBSNeo3) {
    super(service)
  }

  async hasToken({ address, collectionHash }: THasTokenParams): Promise<boolean> {
    if (!collectionHash) {
      throw new BSError('collectionHash is required to get NFT from GhostMarketNDSNeo3', 'REQUIRED_PARAMETER_MISSING')
    }

    const { NeonParser, NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({ rpcAddress: this._service.network.url })
    try {
      const result = await invoker.testInvoke({
        invocations: [
          {
            scriptHash: collectionHash,
            operation: 'balanceOf',
            args: [
              {
                type: 'Hash160',
                value: address,
              },
            ],
          },
        ],
      })

      return NeonParser.parseRpcResponse(result.stack[0], { type: 'Integer' }) > 0
    } catch {
      throw new Error(`Token not found: ${collectionHash}`)
    }
  }

  getChain(): string {
    const chain = GhostMarketNDSNeo3.CHAIN_BY_NETWORK_ID[this._service.network.id]
    if (!chain) throw new Error('Network not supported')

    return chain
  }
}
