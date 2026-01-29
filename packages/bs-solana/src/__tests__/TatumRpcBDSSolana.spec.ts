import { BSUtilsHelper } from '@cityofzion/blockchain-service'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { TatumRpcBDSSolana } from '../services/blockchain-data/TatumRpcBDSSolana'

let rpcBDSSolana: TatumRpcBDSSolana<'test'>

describe('TatumRpcBDSSolana', () => {
  beforeEach(async () => {
    const service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK)
    rpcBDSSolana = new TatumRpcBDSSolana(service)

    await BSUtilsHelper.wait(2000) // Wait 2 seconds to avoid rate limit
  })

  // It may throw an error as the tatum devnet only returns transaction made in less than 10 days
  it('Should be able to get transaction', async () => {
    const hash = 'eagpXrR1TP9H9jRyPcGaaAksJuyoSiK76aQyJT92uYJ2MDK7hy1e7bi9krHhTLEaSNEKU7cSUGwyoUFugR4ysrw'

    const transaction = await rpcBDSSolana.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        block: expect.any(Number),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        notificationCount: expect.any(Number),
        networkFeeAmount: expect.anything(),
        systemFeeAmount: expect.anything(),
        type: expect.any(String),
      })
    )

    transaction.events.forEach(event => {
      expect(event).toEqual(
        expect.objectContaining({
          eventType: expect.any(String),
          amount: expect.anything(),
          methodName: expect.any(String),
          from: expect.anything(),
          fromUrl: expect.anything(),
          to: expect.anything(),
          toUrl: expect.anything(),
          contractHash: expect.any(String),
          contractHashUrl: expect.any(String),
          token: expect.objectContaining({
            decimals: expect.any(Number),
            symbol: expect.any(String),
            name: expect.any(String),
            hash: expect.any(String),
          }),
          tokenType: expect.any(String),
        })
      )
    })
  })

  // It may throw an error as the tatum devnet only returns transaction made in less than 10 days
  it('Should be able to get transactions of address', async () => {
    const address = '8X35rQUK2u9hfn8rMPwwr6ZSEUhbmfDPEapp589XyoM1'
    const response = await rpcBDSSolana.getTransactionsByAddress({ address: address })

    expect(response.transactions.length).toBeGreaterThan(0)
    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          txId: expect.any(String),
          txIdUrl: expect.any(String),
          block: expect.any(Number),
          date: expect.any(String),
          invocationCount: expect.any(Number),
          notificationCount: expect.any(Number),
          networkFeeAmount: expect.anything(),
          systemFeeAmount: expect.anything(),
          type: expect.any(String),
        })
      )

      transaction.events.forEach(event => {
        expect(event).toEqual(
          expect.objectContaining({
            eventType: expect.any(String),
            amount: expect.anything(),
            methodName: expect.any(String),
            from: expect.anything(),
            fromUrl: expect.anything(),
            to: expect.anything(),
            toUrl: expect.anything(),
            contractHash: expect.any(String),
            contractHashUrl: expect.any(String),
            token: expect.objectContaining({
              decimals: expect.any(Number),
              symbol: expect.any(String),
              name: expect.any(String),
              hash: expect.any(String),
            }),
            tokenType: expect.any(String),
          })
        )
      })
    })
  })

  it('Should be able to get sol info', async () => {
    const hash = '-'
    const token = await rpcBDSSolana.getTokenInfo(hash)

    expect(token).toEqual({
      symbol: 'SOL',
      name: 'SOL',
      hash: '-',
      decimals: 9,
    })
  })

  it('Should be able to get token info', async () => {
    const hash = '9fsrJBcWa4WkanpUvo7xETAHTUAKnHXEHhVzYerss2Jf'
    const token = await rpcBDSSolana.getTokenInfo(hash)

    expect(token).toEqual({
      symbol: 'CAT',
      name: '$CAT',
      decimals: 18,
      hash: '9fsrJBcWa4WkanpUvo7xETAHTUAKnHXEHhVzYerss2Jf',
    })
  })

  // TODO: Needs paid plan on Tatum to work
  it.skip('Should be able to get balance', async () => {
    const address = 'F6pwhbYdsEso1yhAihxLxiWtHKS7vhnEVnLakNn4L3tN'
    const balance = await rpcBDSSolana.getBalance(address)

    expect(balance.length).toBeGreaterThan(0)
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
