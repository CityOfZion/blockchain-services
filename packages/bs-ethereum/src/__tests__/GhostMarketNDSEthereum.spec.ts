import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { GhostMarketNDSEthereum } from '../services/nft-data/GhostMarketNDSEthereum'

let ghostMarketNDSEthereum: GhostMarketNDSEthereum

describe.skip('GhostMarketNDSEthereum', () => {
  beforeAll(() => {
    ghostMarketNDSEthereum = new GhostMarketNDSEthereum(BSEthereumConstants.DEFAULT_NETWORK)
  })

  it('Get NFT', async () => {
    const nft = await ghostMarketNDSEthereum.getNft({
      contractHash: '0xeb3a9a839dfeeaf71db1b4ed6a8ae0ccb171b227',
      tokenId: '379',
    })

    expect(nft).toEqual(
      expect.objectContaining({
        id: '379',
        contractHash: '0xeb3a9a839dfeeaf71db1b4ed6a8ae0ccb171b227',
        symbol: 'MOAR',
        collectionImage: expect.any(String),
        collectionName: '"MOAR" by Joan Cornella',
        image: expect.any(String),
        isSVG: expect.any(Boolean),
        name: 'MOAR #379',
        creator: {
          address: '0xd71ef31e9d4e8674d9177c28cc2d0d633580615b',
          name: undefined,
        },
      })
    )
  })

  it('Get NFTS by address', async () => {
    const nfts = await ghostMarketNDSEthereum.getNftsByAddress({
      address: '0xd773c81a4a855556ce2f2372b12272710b95b26c',
    })
    expect(nfts.items.length).toBeGreaterThan(0)
    nfts.items.forEach(nft => {
      expect(nft).toEqual(
        expect.objectContaining({
          symbol: expect.any(String),
          id: expect.any(String),
          contractHash: expect.any(String),
        })
      )
    })
  })

  it('Check if address has specific Token', async () => {
    const address: string = '0xd773c81a4a855556ce2f2372b12272710b95b26c'
    const nfts = await ghostMarketNDSEthereum.getNftsByAddress({
      address: address,
    })
    for (const { contractHash } of nfts.items) {
      const hasToken: boolean = await ghostMarketNDSEthereum.hasToken({
        address,
        contractHash,
      })
      expect(hasToken).toBeTruthy()
    }
  }, 60000)
})
