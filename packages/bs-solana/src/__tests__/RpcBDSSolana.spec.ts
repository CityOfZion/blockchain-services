import { BSUtilsHelper } from '@cityofzion/blockchain-service'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { RpcBDSSolana } from '../services/blockchain-data/RpcBDSSolana'

let rpcBDSSolana: RpcBDSSolana

describe('RpcBDSSolana', () => {
  beforeEach(async () => {
    const service = new BSSolana(BSSolanaConstants.TESTNET_NETWORK)
    rpcBDSSolana = new RpcBDSSolana(service)

    await BSUtilsHelper.wait(2000) // Wait 2 seconds to avoid rate limit
  })

  // It may throw an error as the Devnet only returns transaction made in less than 10 days
  it.skip('Should be able to get transaction', async () => {
    const hash = '4PD7zX51PeEf4VMrwwmAQtZaS5R4j1cztZYYC7kUx3QG72wFBMxmf6CsrX4e9AQFqUhR6YgZyUsSVJB4yziS52uE'
    const transaction = await rpcBDSSolana.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        block: expect.any(Number),
        date: expect.any(String),
        blockchain: 'solana',
        isPending: false,
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
      })
    )

    expect(transaction.events.length).toBeGreaterThan(0)
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
          tokenUrl: expect.any(String),
          token: expect.objectContaining({
            decimals: expect.any(Number),
            symbol: expect.any(String),
            name: expect.any(String),
            hash: expect.any(String),
          }),
        }),
      ])
    )
  })

  // It may throw an error as the Devnet only returns transaction made in less than 10 days
  it.skip('Should be able to get transactions of address', async () => {
    const address = '6RAb9hDKR777EWccBnH4DqJJMvwmoeLegpKYrouFGeJa'
    const response = await rpcBDSSolana.getTransactionsByAddress({ address })

    expect(response.transactions.length).toBeGreaterThan(0)
    expect(response.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isPending: false,
          blockchain: 'solana',
          relatedAddress: address,
          txId: expect.any(String),
          txIdUrl: expect.any(String),
          block: expect.any(Number),
          date: expect.any(String),
          networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
          view: 'default',
          events: expect.any(Array),
        }),
      ])
    )

    const events = response.transactions.flatMap(transaction => transaction.events)

    if (events.length > 0) {
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            eventType: expect.any(String),
            amount: expect.stringMatching(/^\d+(\.\d+)?$/),
            methodName: expect.any(String),
            from: expect.anything(),
            fromUrl: expect.anything(),
            to: expect.anything(),
            toUrl: expect.anything(),
            tokenUrl: expect.any(String),
            token: expect.objectContaining({
              decimals: expect.any(Number),
              symbol: expect.any(String),
              name: expect.any(String),
              hash: expect.any(String),
            }),
          }),
        ])
      )
    }
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
