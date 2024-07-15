import { BSEthereumHelper } from '../BSEthereumHelper'
import { BitqueryBDSEthereum } from '../BitqueryBDSEthereum'

const bitqueryBDSEthereum = new BitqueryBDSEthereum(BSEthereumHelper.DEFAULT_NETWORK)

describe.skip('BitqueryBDSEthereum', () => {
  it('Should be able to get transaction - %s', async () => {
    const hash = '0x12f994e6cecbe4495b4fdef08a2db8551943813b21f3434aa5c2356f8686fa8b'
    const transaction = await bitqueryBDSEthereum.getTransaction(hash)

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

  it('Should be able to get transactions of address - %s', async () => {
    const address = '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89'
    const response = await bitqueryBDSEthereum.getTransactionsByAddress({ address: address, page: 1 })
    expect(response.totalCount).toBeGreaterThan(0)
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

  it('Should be able to get eth info - %s', async () => {
    const hash = '-'
    const token = await bitqueryBDSEthereum.getTokenInfo(hash)

    expect(token).toEqual({
      symbol: 'ETH',
      name: 'Ethereum',
      hash: '-',
      decimals: 18,
    })
  })

  it('Should be able to get token info - %s', async () => {
    const hash = '0xB8c77482e45F1F44dE1745F52C74426C631bDD52'
    const token = await bitqueryBDSEthereum.getTokenInfo(hash)

    expect(token).toEqual({
      hash: '0xb8c77482e45f1f44de1745f52c74426c631bdd52',
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    })
  })

  it('Should be able to get balance - %s', async () => {
    const address = '0x82B5Cd984880C8A821429cFFf89f36D35BaeBE89'
    const balance = await bitqueryBDSEthereum.getBalance(address)

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

  it('Should be able to get a list of rpc - %s', async () => {
    const list = await bitqueryBDSEthereum.getRpcList()
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
