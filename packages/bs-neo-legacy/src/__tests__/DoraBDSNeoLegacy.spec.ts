import { BSNeoLegacy } from '../BSNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { DoraBDSNeoLegacy } from '../services/blockchain-data/DoraBDSNeoLegacy'

let doraBDSNeoLegacy: DoraBDSNeoLegacy

describe('DoraBDSNeoLegacy', () => {
  beforeEach(() => {
    doraBDSNeoLegacy = new DoraBDSNeoLegacy(new BSNeoLegacy(BSNeoLegacyConstants.MAINNET_NETWORK))
  })

  it('Should be able to get transaction', async () => {
    const hash = '0xa7517641bf2d6e9683d66c0d58221e3d1b46b616a2231cd7c7d4a611ce825cc8'
    const transaction = await doraBDSNeoLegacy.getTransaction(hash)

    expect(transaction).toEqual(
      expect.objectContaining({
        txId: expect.any(String),
        txIdUrl: expect.any(String),
        block: expect.any(Number),
        date: expect.any(String),
        blockchain: 'neoLegacy',
        isPending: false,
        networkFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        systemFeeAmount: expect.stringMatching(/^\d+(\.\d+)?$/),
        view: 'default',
        events: expect.arrayContaining([
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
        ]),
      })
    )
  })

  it('Should be able to get history transactions', async () => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
    const response = await doraBDSNeoLegacy.getTransactionsByAddress({ address })

    expect(response.transactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          txId: expect.any(String),
          txIdUrl: expect.any(String),
          block: expect.any(Number),
          date: expect.any(String),
          blockchain: 'neoLegacy',
          relatedAddress: address,
          isPending: false,
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
            methodName: expect.any(String),
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

  it.skip('Should be able to get contract', async () => {
    const hash = '0x998a0da7ec5f21c9a99ef5349f81af8af89f9644'
    const contract = await doraBDSNeoLegacy.getContract(hash)

    expect(contract).toEqual({
      hash: hash,
      name: 'Phantasma Stake',
      methods: [],
    })
  })

  it('Should be able to get token info', async () => {
    const hash = '0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7'
    const token = await doraBDSNeoLegacy.getTokenInfo(hash)

    expect(token).toEqual({
      symbol: 'GAS',
      name: 'GAS',
      hash: hash,
      decimals: 8,
    })
  })

  it('Should be able to get balance', async () => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
    const balance = await doraBDSNeoLegacy.getBalance(address)

    expect(balance).toEqual(
      expect.arrayContaining([
        {
          amount: expect.stringMatching(/^\d+(\.\d+)?$/),
          token: {
            hash: expect.any(String),
            name: expect.any(String),
            symbol: expect.any(String),
            decimals: expect.any(Number),
          },
        },
      ])
    )
  })
})
