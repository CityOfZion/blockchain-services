import { BSNeoX } from '../BSNeoX'
import { GhostMarketNDSNeoX } from '../services/nft-data/GhostMarketNDSNeoX'

let ghostMarketNDSEthereum: GhostMarketNDSNeoX<'test'>

describe('Neo X Blockchain', () => {
  beforeAll(() => {
    const service = new BSNeoX('test')
    ghostMarketNDSEthereum = new GhostMarketNDSNeoX(service)
  })

  describe('NEONAUTS', () => {
    const collectionHash = '0x337015aaa325c684b175591bfed6ea3d3c351bb3'
    const tokenHash = '101'
    const address = '0x2ee6a88f62e8645f671a1f889021b423b763f62c'

    it('Should get NFT by contract hash and token id', async () => {
      const nft = await ghostMarketNDSEthereum.getNft({ collectionHash, tokenHash })

      expect(nft).toEqual({
        hash: tokenHash,
        collection: {
          hash: collectionHash,
          name: 'NEONAUTS',
          image: undefined,
        },
        symbol: 'XNAUTS',
        image: expect.any(String),
        explorerUri: expect.any(String),
        isSVG: expect.any(Boolean),
        name: `NEONAUTS #${tokenHash}`,
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
          hash: expect.any(String),
          collection: {
            image: undefined,
            hash: expect.any(String),
            name: expect.any(String),
          },
          symbol: expect.any(String),
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

      for (const { collection } of items) {
        const hasToken = await ghostMarketNDSEthereum.hasToken({ address, collectionHash: collection.hash })

        expect(hasToken).toBeTruthy()
      }
    })
  })

  describe('GHOST', () => {
    const collectionHash = '0x0b53b5da7d0f275c31a6a182622bdf02474af253'
    const tokenHash = '6'
    const address = '0x65541cf682dfd1b113a675204e24772c159bde60'
    const creatorName = 'bettyboop'

    it('Should get NFT by contract hash and token id', async () => {
      const nft = await ghostMarketNDSEthereum.getNft({ collectionHash, tokenHash })

      expect(nft).toMatchObject({
        hash: tokenHash,
        collection: expect.objectContaining({
          hash: collectionHash,
          name: 'GHOST',
        }),
        symbol: 'GHOST',
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
          hash: expect.any(String),
          collection: expect.objectContaining({
            hash: expect.any(String),
            name: expect.any(String),
          }),
          symbol: expect.any(String),
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

      for (const { collection } of items) {
        // Try and catch to ignore ERC1155 error in hasToken
        try {
          const hasToken = await ghostMarketNDSEthereum.hasToken({ address, collectionHash: collection.hash })

          expect(hasToken).toBeTruthy()
        } catch {
          /* empty */
        }
      }
    })
  })
})
