import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { TatumRpcBDSSolana } from '../services/blockchain-data/TatumRpcBDSSolana'

const network = BSSolanaConstants.TESTNET_NETWORKS[0]
let rpcBDSSolana: TatumRpcBDSSolana

describe('TatumRpcBDSSolana', () => {
  beforeAll(() => {
    rpcBDSSolana = new TatumRpcBDSSolana(
      network,
      BSSolanaConstants.NATIVE_TOKEN,
      process.env.TATUM_MAINNET_API_KEY!,
      process.env.TATUM_TESTNET_API_KEY!
    )
  })

  // It may throw an error as the tatum devnet only returns transaction made in less than 10 days
  it('Should be able to get transaction', async () => {
    const hash = '4tbBQtZD84ssC86DjYP6S6TNoW6f2XWuwvBX9mxBT38dgdHTzuxsD6ap8BN6Xm61DLvPn1NpjZKTNPtCi5dBAPgG'

    const transaction = await rpcBDSSolana.getTransaction(hash)

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
  }, 10000)

  // It may throw an error as the tatum devnet only returns transaction made in less than 10 days
  it('Should be able to get transactions of address', async () => {
    const address = 'ANVUJaJoVaJZELtV2AvRp7V5qPV1B84o29zAwDhPj1c2'
    const response = await rpcBDSSolana.getTransactionsByAddress({ address: address })

    expect(response.transactions.length).toBeGreaterThan(0)
    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          block: expect.any(Number),
          hash: expect.any(String),
          notifications: [],
          time: expect.any(Number),
          fee: expect.any(String),
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
  }, 60000)

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

  it('Should be able to get a list of rpc', async () => {
    const list = await rpcBDSSolana.getRpcList()
    expect(list.length).toBeGreaterThan(0)
    list.forEach(rpc => {
      expect(rpc).toEqual({
        height: expect.any(Number),
        latency: expect.any(Number),
        url: expect.any(String),
      })
    })
  }, 50000)
})
