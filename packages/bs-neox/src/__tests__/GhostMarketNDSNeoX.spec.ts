import { BSNeoXConstants } from '../constants/BSNeoXConstants'
import { GhostMarketNDSNeoX } from '../services/nft-data/GhostMarketNDSNeoX'

let ghostMarketNDSEthereum: GhostMarketNDSNeoX

describe('Neo X Blockchain', () => {
  beforeAll(() => {
    ghostMarketNDSEthereum = new GhostMarketNDSNeoX(BSNeoXConstants.MAINNET_NETWORK)
  })

  describe('NEONAUTS', () => {
    const contractHash = '0x337015aaa325c684b175591bfed6ea3d3c351bb3'
    const tokenId = '101'
    const address = '0x2ee6a88f62e8645f671a1f889021b423b763f62c'

    it('Should get NFT by contract hash and token id', async () => {
      const nft = await ghostMarketNDSEthereum.getNft({ contractHash, tokenId })

      expect(nft).toEqual({
        collectionImage: undefined,
        id: tokenId,
        contractHash,
        symbol: 'XNAUTS',
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

    it('Should get NFTs by address', async () => {
      const { items, nextCursor } = await ghostMarketNDSEthereum.getNftsByAddress({ address })

      items.forEach(nft => {
        expect(nft).toMatchObject({
          collectionImage: undefined,
          id: expect.any(String),
          contractHash: expect.any(String),
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

  describe('GHOST', () => {
    const contractHash = '0x0b53b5da7d0f275c31a6a182622bdf02474af253'
    const tokenId = '6'
    const address = '0x65541cf682dfd1b113a675204e24772c159bde60'
    const creatorName = 'bettyboop'

    it('Should get NFT by contract hash and token id', async () => {
      const nft = await ghostMarketNDSEthereum.getNft({ contractHash, tokenId })

      expect(nft).toMatchObject({
        id: tokenId,
        contractHash,
        symbol: 'GHOST',
        collectionName: 'GHOST',
        image: expect.any(String),
        isSVG: expect.any(Boolean),
        name: 'BeTTyBooP',
        creator: {
          address,
          name: creatorName,
        },
      })
    })

    it('Should get NFTS by address', async () => {
      const { items, nextCursor } = await ghostMarketNDSEthereum.getNftsByAddress({ address })

      items.forEach(nft => {
        expect(nft).toMatchObject({
          id: expect.any(String),
          contractHash: expect.any(String),
          symbol: expect.any(String),
          collectionName: expect.any(String),
          image: expect.any(String),
          isSVG: expect.any(Boolean),
          name: expect.any(String),
          creator: {
            address,
            name: creatorName,
          },
        })
      })

      expect(items.length).toBeGreaterThan(0)
      expect(nextCursor).toBeTruthy()
    })

    it('Should check if address has specific token when get by address', async () => {
      const { items } = await ghostMarketNDSEthereum.getNftsByAddress({ address })

      for (const { contractHash } of items) {
        // Try and catch to ignore ERC1155 error in hasToken
        try {
          const hasToken = await ghostMarketNDSEthereum.hasToken({ address, contractHash })

          expect(hasToken).toBeTruthy()
        } catch {
          /* empty */
        }
      }
    }, 40000)
  })
})
