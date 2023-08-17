import { BDSClaimable, BlockchainDataService } from '@cityofzion/blockchain-service'
import { DoraBDSNeoLegacy } from '../DoraBDSNeoLegacy'

let doraBDSNeoLegacy = new DoraBDSNeoLegacy({ type: 'testnet', url: 'http://seed5.ngd.network:20332' })

describe('BDSNeoLegacy', () => {
  it.each([doraBDSNeoLegacy])('Should be able to get transaction - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const hash = '0x6632e79b1e5182355bcc1f3ca0e91d11a426c893734cd266e7bf3d3f74618add'
    const transaction = await bdsNeoLegacy.getTransaction(hash)
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
            type: 'asset',
          }),
        ]),
        time: expect.any(String),
        netfee: expect.any(String),
        sysfee: expect.any(String),
        totfee: expect.any(String),
      })
    )
  })

  it.each([doraBDSNeoLegacy])(
    'Should be able to get history transactions - %s',
    async (bdsNeoLegacy: BlockchainDataService) => {
      const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
      try {
        const transaction = await bdsNeoLegacy.getHistoryTransactions(address, 1)
        expect(transaction).toEqual(
          expect.arrayContaining(
            expect.objectContaining({
              block: expect.any(Number),
              hash: expect.any(String),
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
                  type: 'asset',
                }),
              ]),
              time: expect.any(String),
              netfee: expect.any(String),
              sysfee: expect.any(String),
              totfee: expect.any(String),
            })
          )
        )
      } catch {}
    }
  )

  it.each([doraBDSNeoLegacy])('Should be able to get contract - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const hash = '0x998a0da7ec5f21c9a99ef5349f81af8af89f9644'
    const contract = await bdsNeoLegacy.getContract(hash)
    expect(contract).toEqual({
      hash: hash,
      name: 'Phantasma Stake',
      methods: [],
    })
  })

  it.each([doraBDSNeoLegacy])('Should be able to get token info - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const hash = '0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7'
    const token = await bdsNeoLegacy.getTokenInfo(hash)
    expect(token).toEqual({
      decimals: 8,
      hash: hash,
      name: 'GAS',
      symbol: 'GAS',
    })
  })

  it.each([doraBDSNeoLegacy])('Should be able to get balance - %s', async (bdsNeoLegacy: BlockchainDataService) => {
    const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
    const balance = await bdsNeoLegacy.getBalance(address)
    expect(balance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: expect.any(Number),
          hash: expect.any(String),
          name: expect.any(String),
          symbol: expect.any(String),
          decimals: expect.any(Number),
        }),
      ])
    )
  })

  it.each([doraBDSNeoLegacy])(
    'Should be able to get unclaimed - %s',
    async (doraBDSNeoLegacy: BlockchainDataService & BDSClaimable) => {
      const address = 'AeGgZTTWPzyVtNiQRcpngkV75Xip1hznmi'
      const unclaimed = await doraBDSNeoLegacy.getUnclaimed(address)
      expect(unclaimed).toEqual(expect.any(Number))
    }
  )
})