import type { TBSNetworkId } from '@cityofzion/blockchain-service'
import { BSEthereum } from '../BSEthereum'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { RpcBDSEthereum } from '../services/blockchain-data/RpcBDSEthereum'

let service: BSEthereum<'ethereum', TBSNetworkId>
let rpcBDSEthereum: RpcBDSEthereum<'ethereum', TBSNetworkId>

describe('RpcBDSEthereum', () => {
  beforeAll(async () => {
    const network = BSEthereumConstants.NETWORKS_BY_EVM.ethereum.find(network => network.type === 'testnet')!

    service = new BSEthereum('ethereum', network)
    rpcBDSEthereum = new RpcBDSEthereum(service)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0x77dac02dec648739f7778093dbcb40eb9bcfa9281c98d495368d87fe6b8ccbab'
    const transaction = await rpcBDSEthereum.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: hash,
        txIdUrl: expect.anything(),
        block: expect.any(Number),
        date: expect.any(String),
        blockchain: 'ethereum',
        isPending: false,
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
      })
    )

    expect(transaction.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: expect.any(String),
          amount: expect.stringMatching(/^\d+(\.\d+)?$/),
          methodName: expect.any(String),
          from: expect.anything(),
          fromUrl: expect.anything(),
          to: expect.anything(),
          toUrl: expect.anything(),
        }),
      ])
    )
  })

  it('Should be able to get ETH info', async () => {
    const [nativeToken] = service.nativeTokens
    const token = await rpcBDSEthereum.getTokenInfo(nativeToken.hash)

    expect(token).toEqual(nativeToken)
  })

  it('Should be able to get balance', async () => {
    const address = '0xbA65F285D1F9E0bf76Ab01211547979a3b60011A'
    const balance = await rpcBDSEthereum.getBalance(address)

    expect(balance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: expect.stringMatching(/^\d+(\.\d+)?$/),
          token: {
            hash: expect.any(String),
            name: expect.any(String),
            symbol: expect.any(String),
            decimals: expect.any(Number),
          },
        }),
      ])
    )
  })
})
