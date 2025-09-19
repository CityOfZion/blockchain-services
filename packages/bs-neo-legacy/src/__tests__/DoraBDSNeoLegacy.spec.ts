import { BSNeoLegacy } from '../BSNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { DoraBDSNeoLegacy } from '../services/blockchain-data/DoraBDSNeoLegacy'

let doraBDSNeoLegacy: DoraBDSNeoLegacy<'test'>

describe('DoraBDSNeoLegacy', () => {
  beforeEach(() => {
    const service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK)
    doraBDSNeoLegacy = new DoraBDSNeoLegacy(service)
  })

  it('Should be able to get transaction', async () => {
    const hash = '0xa7517641bf2d6e9683d66c0d58221e3d1b46b616a2231cd7c7d4a611ce825cc8'
    const transaction = await doraBDSNeoLegacy.getTransaction(hash)
    expect(transaction).toEqual(
      expect.objectContaining({
        block: expect.any(Number),
        hash,
        notifications: [],
        transfers: expect.arrayContaining([
          expect.objectContaining({
            amount: expect.any(String),
            from: expect.any(String),
            to: expect.any(String),
            type: 'token',
          }),
        ]),
        time: expect.any(Number),
        fee: expect.any(String),
        type: 'default',
      })
    )
  })

  it('Should be able to get history transactions', async () => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'

    const response = await doraBDSNeoLegacy.getTransactionsByAddress({ address })
    response.transactions.forEach(transaction => {
      expect(transaction).toEqual(
        expect.objectContaining({
          block: expect.any(Number),
          hash: expect.any(String),
          notifications: [],
          transfers: expect.arrayContaining([
            expect.objectContaining({
              amount: expect.any(String),
              from: expect.any(String),
              to: expect.any(String),
              type: 'token',
            }),
          ]),
          time: expect.any(Number),
          type: 'default',
        })
      )
    })
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
      decimals: 8,
      hash: hash,
      name: 'GAS',
      symbol: 'GAS',
    })
  })

  it('Should be able to get balance', async () => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
    const balance = await doraBDSNeoLegacy.getBalance(address)

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
