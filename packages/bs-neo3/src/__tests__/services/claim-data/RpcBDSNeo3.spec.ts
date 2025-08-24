import { BSNeo3 } from '../../../BSNeo3'
import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { RpcCDSNeo3 } from '../../../services/chaim-data/RpcCDSNeo3'

const network = BSNeo3Constants.TESTNET_NETWORK

let rpcCDSNeo3: RpcCDSNeo3<'test'>

describe('RpcCDSNeo3', () => {
  beforeEach(() => {
    const service = new BSNeo3('test', network)
    rpcCDSNeo3 = new RpcCDSNeo3(service)
  })

  it('Should be able to get unclaimed', async () => {
    const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
    const unclaimed = await rpcCDSNeo3.getUnclaimed(address)
    expect(unclaimed).toEqual(expect.any(String))
  })
})
