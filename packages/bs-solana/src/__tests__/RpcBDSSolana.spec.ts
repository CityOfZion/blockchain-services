import { BSUtilsHelper } from '@cityofzion/blockchain-service'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { RpcBDSSolana } from '../services/blockchain-data/RpcBDSSolana'

let rpcBDSSolana: RpcBDSSolana<'test'>

describe('RpcBDSSolana', () => {
  beforeEach(async () => {
    const service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK)
    rpcBDSSolana = new RpcBDSSolana(service)

    await BSUtilsHelper.wait(2000) // Wait 2 seconds to avoid rate limit
  })

  // It may throw an error as the devnet only returns transaction made in less than 10 days
  it.skip('Should be able to get transaction', async () => {
    const hash = '2jAaNbYFsEVsjQ8eeF1woaRsWWdQf3mogrRtXErNf1gumEbH2YF7d9fF1iBmCxXAiKtVbpM2zasctJmfF39WtZ28'

    const transaction = await rpcBDSSolana.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        block: expect.any(Number),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        notificationCount: expect.any(Number),
        networkFeeAmount: expect.any(String),
        type: expect.any(String),
      })
    )

    expect(transaction.events.length).toBeGreaterThan(0)
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

  // It may throw an error as the devnet only returns transaction made in less than 10 days
  it('Should be able to get transactions of address', async () => {
    const address = 'BBUp5x8wCDpK26qYVgwJY7gTdf8mBdAYd63cAsuqjTw3'
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

  it('Should be able to get balance', async () => {
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
