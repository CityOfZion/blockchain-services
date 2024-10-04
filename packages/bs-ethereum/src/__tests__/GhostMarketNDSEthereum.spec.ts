import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { GhostMarketNDSEthereum } from '../services/nft-data/GhostMarketNDSEthereum'

let ghostMarketNDSEthereum: GhostMarketNDSEthereum

describe('GhostMarketNDSEthereum', () => {
  describe.skip('Ethereum Blockchain', () => {
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

  describe('Neo X Blockchain', () => {
    const contractHash = '0x337015aaa325c684b175591bfed6ea3d3c351bb3'
    const tokenId = '101'
    const address = '0x2ee6a88f62e8645f671a1f889021b423b763f62c'

    beforeAll(() => {
      ghostMarketNDSEthereum = new GhostMarketNDSEthereum(BSEthereumConstants.NEOX_MAINNET_NETWORK)
    })

    it('Should get NFT by contract hash and token id', async () => {
      const nft = await ghostMarketNDSEthereum.getNft({ contractHash, tokenId })

      expect(nft).toEqual({
        id: tokenId,
        contractHash,
        symbol: 'XNAUTS',
        collectionImage: undefined,
        collectionName: 'NEONAUTS',
        image: expect.any(String),
        isSVG: expect.any(Boolean),
        name: `NEONAUTS #${tokenId}`,
        creator: {
          address,
          name: undefined,
        },
      })
    })

    it('Should get NFTS by address', async () => {
      const { items, nextCursor } = await ghostMarketNDSEthereum.getNftsByAddress({ address })

      items.forEach(nft => {
        expect(nft).toMatchObject({
          collectionImage: undefined,
          id: expect.any(String),
          contractHash,
          symbol: expect.any(String),
          collectionName: expect.any(String),
          image: expect.any(String),
          isSVG: expect.any(Boolean),
          name: expect.any(String),
          creator: {
            address,
            name: undefined,
          },
        })
      })

      expect(items.length).toBeGreaterThan(0)
      expect(nextCursor).toBeTruthy()
    })

    it('Should check if address has specific token when get by address', async () => {
      const { items } = await ghostMarketNDSEthereum.getNftsByAddress({ address })

      for (const { contractHash } of items) {
        const hasToken = await ghostMarketNDSEthereum.hasToken({ address, contractHash })

        expect(hasToken).toBeTruthy()
      }
    }, 20000)
  })
})
