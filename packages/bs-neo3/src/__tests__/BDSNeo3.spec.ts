import { BDSClaimable, BlockchainDataService } from '@cityofzion/blockchain-service'
import { DoraBDSNeo3 } from '../DoraBDSNeo3'
import { RPCBDSNeo3 } from '../RpcBDSNeo3'
import { BSNeo3Helper } from '../BSNeo3Helper'

const network = BSNeo3Helper.TESTNET_NETWORKS[0]
const tokens = BSNeo3Helper.getTokens(network)

const GAS = tokens.find(token => token.symbol === 'GAS')!

const doraBDSNeo3 = new DoraBDSNeo3(network, GAS, GAS, tokens)
const rpcBDSNeo3 = new RPCBDSNeo3(network, GAS, GAS, tokens)

describe('BDSNeo3', () => {
  it.each([doraBDSNeo3, rpcBDSNeo3])(
    'Should be able to get transaction - %s',
    async (bdsNeo3: BlockchainDataService) => {
      const hash = '0x70e7381c5dee6e81becd02844e4e0199f6b3df834213bc89418dc4da32cf3f21'
      const transaction = await bdsNeo3.getTransaction(hash)

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
    },
    60000
  )

  it.each([doraBDSNeo3])(
    'Should be able to get transactions of address - %s',
    async (bdsNeo3: BlockchainDataService) => {
      const address = 'NPB3Cze4wki9J36nnrT45qmi6P52Bhfqph'
      const response = await bdsNeo3.getTransactionsByAddress({ address, nextPageParams: 1 })
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
    },
    60000
  )

  it.each([doraBDSNeo3, rpcBDSNeo3])(
    'Should be able to get contract - %s',
    async (bdsNeo3: BlockchainDataService) => {
      const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
      const contract = await bdsNeo3.getContract(hash)
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
    },
    60000
  )

  it.each([doraBDSNeo3, rpcBDSNeo3])(
    'Should be able to get token info - %s',
    async (bdsNeo3: BlockchainDataService) => {
      const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
      const token = await bdsNeo3.getTokenInfo(hash)

      expect(token).toEqual({
        decimals: 8,
        hash: hash,
        name: 'GasToken',
        symbol: 'GAS',
      })
    },
    60000
  )

  it.each([doraBDSNeo3, rpcBDSNeo3])(
    'Should be able to get balance - %s',
    async (bdsNeo3: BlockchainDataService) => {
      const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
      const balance = await bdsNeo3.getBalance(address)
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
    },
    60000
  )

  it.each([doraBDSNeo3, rpcBDSNeo3])(
    'Should be able to get unclaimed - %s',
    async (bdsNeo3: BlockchainDataService & BDSClaimable) => {
      const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
      const unclaimed = await bdsNeo3.getUnclaimed(address)
      expect(unclaimed).toEqual(expect.any(String))
    },
    60000
  )

  it.each([rpcBDSNeo3])(
    'Should be able to get a list of rpc - %s',
    async (bdsNeo3: BlockchainDataService) => {
      const list = await bdsNeo3.getRpcList()
      expect(list.length).toBeGreaterThan(0)
      list.forEach(rpc => {
        expect(rpc).toEqual({
          height: expect.any(Number),
          latency: expect.any(Number),
          url: expect.any(String),
        })
      })
    },
    60000
  )
})
