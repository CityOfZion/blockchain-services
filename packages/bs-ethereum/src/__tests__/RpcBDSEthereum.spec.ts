import { BSEthereumHelper } from '../BSEthereumHelper'
import { RpcBDSEthereum } from '../RpcBDSEthereum'

const network = BSEthereumHelper.TESTNET_NETWORKS.find(network => network.id === '11155111')!
const rpcBDSEthereum = new RpcBDSEthereum(network)

describe('RpcBDSEthereum', () => {
  it('Should be able to get transaction', async () => {
    const hash = '0x48eac645fac2280d7ac89a319372d7a38d52516f8b3003574bfaaed31b471ff3'
    const transaction = await rpcBDSEthereum.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        block: expect.any(Number),
        hash,
        notifications: [],
        time: expect.any(Number),
      })
    )
    transaction.transfers.forEach(transfer => {
      expect(transfer).toEqual(
        expect.objectContaining({
          from: expect.any(String),
          to: expect.any(String),
          contractHash: expect.any(String),
          amount: expect.any(String),
          type: expect.any(String),
        })
      )
    })
  })

  it('Should be able to get eth info', async () => {
    const hash = '-'
    const token = await rpcBDSEthereum.getTokenInfo(hash)

    expect(token).toEqual({
      symbol: 'ETH',
      name: 'ETH',
      hash: '-',
      decimals: 18,
    })
  }, 60000)

  it('Should be able to get balance', async () => {
    const address = '0xbA65F285D1F9E0bf76Ab01211547979a3b60011A'
    const balance = await rpcBDSEthereum.getBalance(address)

    balance.forEach(balance => {
      expect(balance).toEqual(
        expect.objectContaining({
          amount: expect.any(String),
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
