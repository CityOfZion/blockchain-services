import { MoralisBDSEthereum } from '../services/blockchain-data/MoralisBDSEthereum'
import { BSEthereumHelper } from '../helpers/BSEthereumHelper'
import { TNetworkId } from '@cityofzion/blockchain-service'
import { BSEthereum } from '../BSEthereum'

let service: BSEthereum<'test', TNetworkId>
let moralisBDSEthereum: MoralisBDSEthereum<'test', TNetworkId>

describe('MoralisBDSEthereum', () => {
  beforeEach(() => {
    service = new BSEthereum('test', 'ethereum')
    moralisBDSEthereum = new MoralisBDSEthereum(service)
  })

  it('Should be able to get transaction - %s', async () => {
    const hash = '0x12f994e6cecbe4495b4fdef08a2db8551943813b21f3434aa5c2356f8686fa8b'

    const transaction = await moralisBDSEthereum.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        block: expect.any(Number),
        hash,
        notifications: [],
        time: expect.any(Number),
        type: expect.any(String),
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

  it('Should be able to get transactions of address - %s', async () => {
    const address = '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89'
    const response = await moralisBDSEthereum.getTransactionsByAddress({ address: address })

    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          block: expect.any(Number),
          hash: expect.any(String),
          notifications: [],
          time: expect.any(Number),
          fee: expect.any(String),
          type: expect.any(String),
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
  })

  it('Should be able to get eth info - %s', async () => {
    const nativeToken = BSEthereumHelper.getNativeAsset(service.network)
    const token = await moralisBDSEthereum.getTokenInfo(nativeToken.hash)

    expect(token).toEqual(nativeToken)
  })

  it('Should be able to get token info - %s', async () => {
    const hash = '0xB8c77482e45F1F44dE1745F52C74426C631bDD52'
    const token = await moralisBDSEthereum.getTokenInfo(hash)

    expect(token).toEqual({
      hash: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    })
  })

  it('Should be able to get balance - %s', async () => {
    const address = '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89'
    const balance = await moralisBDSEthereum.getBalance(address)

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

  it('Should be able to get a list of rpc - %s', async () => {
    const list = await moralisBDSEthereum.getRpcList()
    expect(list.length).toBeGreaterThan(0)
    list.forEach(rpc => {
      expect(rpc).toEqual({
        height: expect.any(Number),
        latency: expect.any(Number),
        url: expect.any(String),
      })
    })
  })
})
