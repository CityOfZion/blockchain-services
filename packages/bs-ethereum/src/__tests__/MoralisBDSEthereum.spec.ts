import { MoralisBDSEthereum } from '../services/blockchain-data/MoralisBDSEthereum'
import { BSEthereumHelper } from '../helpers/BSEthereumHelper'
import { TBSNetworkId } from '@cityofzion/blockchain-service'
import { BSEthereum } from '../BSEthereum'

let service: BSEthereum<'test', TBSNetworkId>
let moralisBDSEthereum: MoralisBDSEthereum<'test', TBSNetworkId>

describe('MoralisBDSEthereum', () => {
  beforeEach(() => {
    service = new BSEthereum('test', 'ethereum')
    moralisBDSEthereum = new MoralisBDSEthereum(service)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0x12f994e6cecbe4495b4fdef08a2db8551943813b21f3434aa5c2356f8686fa8b'

    const transaction = await moralisBDSEthereum.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.anything(),
        block: expect.any(Number),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        notificationCount: expect.any(Number),
        networkFeeAmount: expect.anything(),
        type: expect.any(String),
      })
    )
    transaction.events.forEach(transfer => {
      expect(transfer).toEqual(
        expect.objectContaining({
          eventType: expect.any(String),
          amount: expect.anything(),
          methodName: expect.any(String),
          from: expect.anything(),
          fromUrl: expect.anything(),
          to: expect.anything(),
          toUrl: expect.anything(),
          tokenType: expect.any(String),
        })
      )
    })
  })

  it('Should be able to get transactions of address', async () => {
    const address = '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89'
    const response = await moralisBDSEthereum.getTransactionsByAddress({ address: address })

    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          txId: expect.any(String),
          txIdUrl: expect.anything(),
          block: expect.any(Number),
          date: expect.any(String),
          invocationCount: expect.any(Number),
          notificationCount: expect.any(Number),
          networkFeeAmount: expect.anything(),
          type: expect.any(String),
        })
      )

      transaction.events.forEach(transfer => {
        expect(transfer).toEqual(
          expect.objectContaining({
            eventType: expect.any(String),
            amount: expect.anything(),
            methodName: expect.any(String),
            from: expect.anything(),
            fromUrl: expect.anything(),
            to: expect.anything(),
            toUrl: expect.anything(),
            tokenType: expect.any(String),
          })
        )
      })
    })
  })

  it('Should be able to get eth info', async () => {
    const nativeToken = BSEthereumHelper.getNativeAsset(service.network)
    const token = await moralisBDSEthereum.getTokenInfo(nativeToken.hash)

    expect(token).toEqual(nativeToken)
  })

  it('Should be able to get token info', async () => {
    const hash = '0xB8c77482e45F1F44dE1745F52C74426C631bDD52'
    const token = await moralisBDSEthereum.getTokenInfo(hash)

    expect(token).toEqual({
      hash: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52',
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    })
  })

  it('Should be able to get balance', async () => {
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
})
