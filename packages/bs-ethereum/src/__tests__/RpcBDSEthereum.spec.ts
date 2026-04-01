import type { TBSNetworkId } from '@cityofzion/blockchain-service'
import { BSEthereum } from '../BSEthereum'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { BSEthereumHelper } from '../helpers/BSEthereumHelper'
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
    const hash = '0x48eac645fac2280d7ac89a319372d7a38d52516f8b3003574bfaaed31b471ff3'
    const transaction = await rpcBDSEthereum.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.anything(),
        block: expect.any(Number),
        date: expect.any(String),
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
      })
    )
    transaction.events.forEach(transfer => {
      expect(transfer).toEqual(
        expect.objectContaining({
          eventType: expect.any(String),
          amount: expect.stringMatching(/^\d+(\.\d+)?$/),
          methodName: expect.any(String),
          from: expect.anything(),
          fromUrl: expect.anything(),
          to: expect.anything(),
          toUrl: expect.anything(),
        })
      )
    })
  })

  it('Should be able to get eth info', async () => {
    const nativeAsset = BSEthereumHelper.getNativeAsset(service.network)
    const token = await rpcBDSEthereum.getTokenInfo(nativeAsset.hash)

    expect(token).toEqual(nativeAsset)
  })

  it('Should be able to get balance', async () => {
    const address = '0xbA65F285D1F9E0bf76Ab01211547979a3b60011A'
    const balance = await rpcBDSEthereum.getBalance(address)

    balance.forEach(balance => {
      expect(balance).toEqual(
        expect.objectContaining({
          amount: expect.stringMatching(/^\d+(\.\d+)?$/),
          token: {
            hash: expect.any(String),
            name: expect.any(String),
            symbol: expect.any(String),
            decimals: expect.any(Number),
          },
        })
      )
    })
  })
})
