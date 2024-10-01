import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { BSNeo3Helper } from '../../../helpers/BSNeo3Helper'
import { DoraBDSNeo3 } from '../../../services/blockchain-data/DoraBDSNeo3'

const network = BSNeo3Constants.TESTNET_NETWORKS[0]
const tokens = BSNeo3Helper.getTokens(network)

const GAS = tokens.find(token => token.symbol === 'GAS')!

let doraBDSNeo3: DoraBDSNeo3

describe('DoraBDSNeo3', () => {
  beforeEach(() => {
    doraBDSNeo3 = new DoraBDSNeo3(network, GAS, GAS, tokens)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0x70e7381c5dee6e81becd02844e4e0199f6b3df834213bc89418dc4da32cf3f21'
    const transaction = await doraBDSNeo3.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        block: expect.any(Number),
        hash,
        notifications: [],
        transfers: [],
        time: expect.any(Number),
        fee: expect.any(String),
      })
    )
  })

  it('Should be able to get transactions of address', async () => {
    const address = 'NPB3Cze4wki9J36nnrT45qmi6P52Bhfqph'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address, nextPageParams: 1 })

    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          block: expect.any(Number),
          hash: expect.any(String),
          time: expect.any(Number),
          fee: expect.any(String),
          notifications: expect.arrayContaining([
            expect.objectContaining({
              eventName: expect.any(String),
              state: expect.arrayContaining([
                {
                  type: expect.any(String),
                  value: expect.any(String),
                },
              ]),
            }),
          ]),
          transfers: expect.arrayContaining([
            expect.objectContaining({
              amount: expect.any(String),
              from: expect.any(String),
              to: expect.any(String),
              type: 'token',
            }),
          ]),
        })
      )
    })
  })

  it('Should be able to get contract', async () => {
    const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
    const contract = await doraBDSNeo3.getContract(hash)

    expect(contract).toEqual({
      hash: hash,
      name: 'GasToken',
      methods: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          parameters: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(String), type: expect.any(String) }),
          ]),
        }),
      ]),
    })
  })

  it('Should be able to get token info', async () => {
    const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
    const token = await doraBDSNeo3.getTokenInfo(hash)

    expect(token).toEqual({
      decimals: 8,
      hash,
      name: 'GasToken',
      symbol: 'GAS',
    })
  })

  it('Should be able to get balance', async () => {
    const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
    const balance = await doraBDSNeo3.getBalance(address)

    balance.forEach(balance => {
      expect(balance).toEqual({
        amount: expect.any(String),
        token: {
          hash: expect.any(String),
          name: expect.any(String),
          symbol: expect.any(String),
          decimals: expect.any(Number),
        },
      })
    })
  }, 10000)

  it('Should be able to get unclaimed', async () => {
    const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
    const unclaimed = await doraBDSNeo3.getUnclaimed(address)

    expect(unclaimed).toEqual(expect.any(String))
  })

  it('Should be able to get a list of rpc', async () => {
    const list = await doraBDSNeo3.getRpcList()

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
