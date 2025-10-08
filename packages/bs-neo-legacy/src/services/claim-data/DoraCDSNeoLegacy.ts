import { IClaimDataService } from '@cityofzion/blockchain-service'
import { rpc } from '@cityofzion/neon-js'
import { IBSNeoLegacy } from '../../types'

export class DoraCDSNeoLegacy<N extends string> implements IClaimDataService {
  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service
  }

  async getUnclaimed(address: string): Promise<string> {
    const rpcClient = new rpc.RPCClient(this.#service.network.url)
    const response = await rpcClient.getUnclaimed(address)

    return (response?.unclaimed ?? 0).toFixed(this.#service.claimToken.decimals)
  }
}
