import { BSNeo3 } from '../../BSNeo3'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { RpcBDSNeo3 } from '../../services/blockchain-data/RpcBDSNeo3'

const network = BSNeo3Constants.TESTNET_NETWORK

let rpcBDSNeo3: RpcBDSNeo3<'test'>

describe('RpcBDSNeo3', () => {
  beforeEach(() => {
    const service = new BSNeo3('test', network)
    rpcBDSNeo3 = new RpcBDSNeo3(service)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0x70e7381c5dee6e81becd02844e4e0199f6b3df834213bc89418dc4da32cf3f21'
    const transaction = await rpcBDSNeo3.getTransaction(hash)

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

  it('Should be able to get contract', async () => {
    const hash = '0xd2a4cff31913016155e38e474a2c06d08be276cf'
    const contract = await rpcBDSNeo3.getContract(hash)

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
    const token = await rpcBDSNeo3.getTokenInfo(hash)

    expect(token).toEqual({
      decimals: 8,
      hash: '0xd2a4cff31913016155e38e474a2c06d08be276cf',
      name: 'GAS',
      symbol: 'GAS',
    })
  })

  it('Should be able to get balance', async () => {
    const address = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
    const balance = await rpcBDSNeo3.getBalance(address)

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
})
