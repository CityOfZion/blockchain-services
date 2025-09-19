import { IClaimDataService } from '@cityofzion/blockchain-service'
import { IBSNeo3 } from '../../types'
import { BSNeo3NeonJsSingletonHelper } from '../../helpers/BSNeo3NeonJsSingletonHelper'

export class RpcCDSNeo3<N extends string> implements IClaimDataService {
  readonly _service: IBSNeo3<N>

  constructor(service: IBSNeo3<N>) {
    this._service = service
  }

  async getUnclaimed(address: string): Promise<string> {
    const { rpc, u } = BSNeo3NeonJsSingletonHelper.getInstance()
    const rpcClient = new rpc.RPCClient(this._service.network.url)
    const response = await rpcClient.getUnclaimedGas(address)
    return u.BigInteger.fromNumber(response).toDecimal(this._service.claimToken.decimals)
  }
}
