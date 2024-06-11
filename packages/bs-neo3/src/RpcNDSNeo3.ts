import {
  GetNftParam,
  GetNftsByAddressParams,
  HasTokenParam,
  Network,
  NetworkType,
  NftDataService,
  NftResponse,
  NftsResponse,
} from '@cityofzion/blockchain-service'
import { NeonInvoker, NeonParser } from '@cityofzion/neon-dappkit'

export abstract class RpcNDSNeo3 implements NftDataService {
  readonly #network: Network

  protected constructor(network: Network) {
    this.#network = network
  }

  abstract getNftsByAddress(params: GetNftsByAddressParams): Promise<NftsResponse>

  abstract getNft(params: GetNftParam): Promise<NftResponse>

  async hasToken({ contractHash, address }: HasTokenParam): Promise<boolean> {
    const parser = NeonParser
    const invoker = await NeonInvoker.init({ rpcAddress: this.#network.url })
    try {
      const result = await invoker.testInvoke({
        invocations: [
          {
            scriptHash: contractHash,
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

      return parser.parseRpcResponse(result.stack[0], { type: 'Integer' }) > 0
    } catch {
      throw new Error(`Token not found: ${contractHash}`)
    }
  }
}
