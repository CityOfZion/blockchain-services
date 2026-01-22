import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { DoraBDSNeo3 } from '../../services/blockchain-data/DoraBDSNeo3'
import { BSNeo3 } from '../../BSNeo3'
import type { TTransaction, TTransactionBridgeNeo3NeoX } from '@cityofzion/blockchain-service'

const network = BSNeo3Constants.TESTNET_NETWORK

let service: BSNeo3<'test'>
let doraBDSNeo3: DoraBDSNeo3<'test'>

describe('DoraBDSNeo3', () => {
  beforeEach(() => {
    service = new BSNeo3('test', network)
    doraBDSNeo3 = new DoraBDSNeo3(service)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0x70e7381c5dee6e81becd02844e4e0199f6b3df834213bc89418dc4da32cf3f21'
    const transaction = await doraBDSNeo3.getTransaction(hash)

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
        events: expect.arrayContaining([
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
          }),
        ]),
      })
    )
  })

  it('Should be able to get transactions of address', async () => {
    const address = 'NRwXs5yZRMuuXUo7AqvetHQ4GDHe3pV7Mb'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address, nextPageParams: 1 })

    response.data.forEach(transaction => {
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
          events: expect.arrayContaining([
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
      name: 'GAS',
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
  })

  it.skip('Should be able to get transactions that are marked as bridge (GAS)', async () => {
    service = new BSNeo3('test', BSNeo3Constants.MAINNET_NETWORK)
    doraBDSNeo3 = new DoraBDSNeo3(service)

    const address = 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address })

    const transaction = response.data.find(
      ({ txId }) => txId === '0x69016c9f2a980b7e71da89e9f18cf46f5e89fe03aaf35d72f7ca5f6bf24b3b55'
    ) as TTransaction & TTransactionBridgeNeo3NeoX

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.token).toEqual(service.neo3NeoXBridgeService.gasToken)
    expect(transaction.data.receiverAddress).toBe('0xa911a7fa0901cfc3f1da55a05593823e32e2f1a9')
  })

  it.skip('Should be able to get transactions that are marked as bridge (NEO)', async () => {
    service = new BSNeo3('test', BSNeo3Constants.MAINNET_NETWORK)
    doraBDSNeo3 = new DoraBDSNeo3(service)

    const address = 'NcTRyXXr2viSowk913dMTvws6sDNbmt8tj'
    const response = await doraBDSNeo3.getTransactionsByAddress({ address })

    const transaction = response.data.find(
      ({ txId }) => txId === '0x979b90734ca49ea989e3515de2028196e42762f96f3fa56db24d1c47521075dd'
    ) as TTransaction & TTransactionBridgeNeo3NeoX

    expect(transaction.type).toBe('bridgeNeo3NeoX')
    expect(transaction.data.amount).toBe('1')
    expect(transaction.data.token).toEqual(service.neo3NeoXBridgeService.neoToken)
    expect(transaction.data.receiverAddress).toBe('0xe94bea1d8bb8bcc13cd6974e6941f4d1896d56da')
  })
})
