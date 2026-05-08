import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import { DoraBDSNeo3 } from '../services/blockchain-data/DoraBDSNeo3'
import { BSNeo3 } from '../BSNeo3'

const network = BSNeo3Constants.MAINNET_NETWORK

let service: BSNeo3
let doraBDSNeo3: DoraBDSNeo3

describe('DoraBDSNeo3', () => {
  beforeEach(() => {
    service = new BSNeo3(network)
    doraBDSNeo3 = new DoraBDSNeo3(service)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0xa170403e1470d0a10c5f6261c46e2b714cebf7ed0196cd2c830099e7e2e05b3e'
    const transaction = await doraBDSNeo3.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        block: expect.any(Number),
        date: expect.any(String),
        invocationCount: expect.any(Number),
        notificationCount: expect.any(Number),
        blockchain: 'neo3',
        isPending: false,
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        systemFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
        events: expect.arrayContaining([
          expect.toBeOneOf([
            expect.objectContaining({
              eventType: expect.any(String),
              amount: expect.stringMatching(/^\d+(\.\d+)?$/),
              methodName: 'transfer',
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
            expect.objectContaining({
              amount: expect.stringMatching(/^\d+(\.\d+)?$/),
              data: { candidate: expect.any(String), token: BSNeo3Constants.NEO_TOKEN.symbol },
              eventType: 'generic',
              from: expect.any(String),
              fromUrl: expect.any(String),
              methodName: 'vote',
            }),
          ]),
        ]),
      })
    )
  })

  it('Should be able to get transactions of address', async () => {
    const address = 'NRwXs5yZRMuuXUo7AqvetHQ4GDHe3pV7Mb'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address, nextPageParams: 1 })

    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          txId: expect.any(String),
          txIdUrl: expect.any(String),
          block: expect.any(Number),
          date: expect.any(String),
          invocationCount: expect.any(Number),
          notificationCount: expect.any(Number),
          blockchain: 'neo3',
          isPending: false,
          relatedAddress: address,
          networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
          systemFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
          view: 'default',
          events: expect.arrayContaining([
            expect.toBeOneOf([
              expect.objectContaining({
                eventType: expect.any(String),
                amount: expect.stringMatching(/^\d+(\.\d+)?$/),
                methodName: 'transfer',
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
              expect.objectContaining({
                amount: expect.stringMatching(/^\d+(\.\d+)?$/),
                data: { candidate: expect.any(String), token: BSNeo3Constants.NEO_TOKEN.symbol },
                eventType: 'generic',
                from: expect.any(String),
                fromUrl: expect.any(String),
                methodName: 'vote',
              }),
            ]),
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
      name: 'GAS',
      symbol: 'GAS',
    })
  })

  it('Should be able to get balance', async () => {
    const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
    const balance = await doraBDSNeo3.getBalance(address)

    balance.forEach(balance => {
      expect(balance).toEqual({
        amount: expect.stringMatching(/^\d+(\.\d+)?$/),
        token: {
          hash: expect.any(String),
          name: expect.any(String),
          symbol: expect.any(String),
          decimals: expect.any(Number),
        },
      })
    })
  })

  it.skip('Should be able to get transactions that are marked as bridge (GAS)', async () => {
    service = new BSNeo3()
    doraBDSNeo3 = new DoraBDSNeo3(service)

    const address = 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address })

    const transaction = response.transactions.find(
      ({ txId }) => txId === '0x9c6a51e6b735dcfcb814b0d1b15877f00da3de732ceef865345104b9cd2a495e'
    )!

    expect(transaction.data).toEqual(
      expect.objectContaining({
        neo3NeoxBridge: {
          amount: '1',
          tokenToUse: service.neo3NeoXBridgeService.gasToken,
          receiverAddress: '0xe3abc0b2a74fd2ef662b1c25c9769398f53b4304',
        },
      })
    )
  })

  it.skip('Should be able to get transactions that are marked as bridge (NEO)', async () => {
    service = new BSNeo3()
    doraBDSNeo3 = new DoraBDSNeo3(service)

    const address = 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address })

    const transaction = response.transactions.find(
      ({ txId }) => txId === '0xdb492b2302182e1870f228c7be72099318357540986ff163971690247631cdc6'
    )!

    expect(transaction.data).toEqual(
      expect.objectContaining({
        neo3NeoxBridge: {
          amount: '1',
          tokenToUse: service.neo3NeoXBridgeService.neoToken,
          receiverAddress: '0xe3abc0b2a74fd2ef662b1c25c9769398f53b4304',
        },
      })
    )
  })
})
