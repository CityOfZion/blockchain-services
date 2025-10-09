import { GhostMarketNDS, THasTokenParam } from '@cityofzion/blockchain-service'

import { IBSNeo3, TBSNeo3NetworkId } from '../../types'
import { BSNeo3NeonDappKitSingletonHelper } from '../../helpers/BSNeo3NeonDappKitSingletonHelper'

export class GhostMarketNDSNeo3<N extends string> extends GhostMarketNDS {
  static readonly CHAIN_BY_NETWORK_ID: Record<TBSNeo3NetworkId, string> = {
    mainnet: 'n3',
    testnet: 'n3t',
  }

  readonly #service: IBSNeo3<N>

  constructor(service: IBSNeo3<N>) {
    super()

    this.#service = service
  }

  async hasToken({ collectionHash, address }: THasTokenParam): Promise<boolean> {
    const { NeonParser, NeonInvoker } = BSNeo3NeonDappKitSingletonHelper.getInstance()

    const invoker = await NeonInvoker.init({ rpcAddress: this.#service.network.url })
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
    const chain = GhostMarketNDSNeo3.CHAIN_BY_NETWORK_ID[this.#service.network.id]
    if (!chain) throw new Error('Network not supported')

    return chain
  }
}
