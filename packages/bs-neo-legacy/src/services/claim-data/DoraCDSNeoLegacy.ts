import { IClaimDataService } from '@cityofzion/blockchain-service'
import { IBSNeoLegacy } from '../../types'
import { BSNeoLegacyNeonJsSingletonHelper } from '../../helpers/BSNeoLegacyNeonJsSingletonHelper'

export class DoraCDSNeoLegacy<N extends string> implements IClaimDataService {
  readonly #service: IBSNeoLegacy<N>

  constructor(service: IBSNeoLegacy<N>) {
    this.#service = service
  }

  async getUnclaimed(address: string): Promise<string> {
    const { rpc } = BSNeoLegacyNeonJsSingletonHelper.getInstance()

    const rpcClient = new rpc.RPCClient(this.#service.network.url)
    const response = await rpcClient.getUnclaimed(address)

    return (response?.unclaimed ?? 0).toFixed(this.#service.claimToken.decimals)
  }
}
