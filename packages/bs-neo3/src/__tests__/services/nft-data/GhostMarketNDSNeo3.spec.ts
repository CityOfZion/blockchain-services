import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { GhostMarketNDSNeo3 } from '../../../services/nft-data/GhostMarketNDSNeo3'

let ghostMarketNDSNeo3: GhostMarketNDSNeo3

describe('GhostMarketNDSNeo3', () => {
  beforeAll(() => {
    ghostMarketNDSNeo3 = new GhostMarketNDSNeo3(BSNeo3Constants.DEFAULT_NETWORK)
  })

  describe('TTM', () => {
    it('Get NFT', async () => {
      const nft = await ghostMarketNDSNeo3.getNft({
        contractHash: '0xaa4fb927b3fe004e689a278d188689c9f050a8b2',
        tokenId: 'SVBLTUYxMTY1',
      })

      expect(nft).toEqual(
        expect.objectContaining({
          id: 'SVBLTUYxMTY1',
          contractHash: '0xaa4fb927b3fe004e689a278d188689c9f050a8b2',
          symbol: 'TTM',
          collectionImage: expect.any(String),
          collectionName: 'TOTHEMOON',
          image: expect.any(String),
          isSVG: expect.any(Boolean),
          name: 'Pink Moon Fish',
          creator: {
            address: 'NQJpnvRaLvPqu8Mm5Bx3d1uJEttwJBN2p9',
            name: undefined,
          },
        })
      )
    })

    it('Get NFTS by address', async () => {
      const nfts = await ghostMarketNDSNeo3.getNftsByAddress({
        address: 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6',
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
      const address: string = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'
      const nfts = await ghostMarketNDSNeo3.getNftsByAddress({
        address: address,
      })
      for (const { contractHash } of nfts.items) {
        const hasToken: boolean = await ghostMarketNDSNeo3.hasToken({
          address,
          contractHash,
        })
        expect(hasToken).toBeTruthy()
      }
    }, 60000)
  })

  describe('GHOST', () => {
    const contractHash = '0x577a51f7d39162c9de1db12a6b319c848e4c54e5'
    const tokenId = '7wA='
    const address = 'Nc18TvxNomHdbizZxcW5znbYWsDSr4C2XR'

    it('Should get NFT by contract hash and token id', async () => {
      const nft = await ghostMarketNDSNeo3.getNft({ contractHash, tokenId })

      expect(nft).toEqual({
        collectionImage: expect.any(String),
        id: tokenId,
        contractHash,
        symbol: 'GHOST',
        collectionName: 'GHOST',
        image: expect.any(String),
        isSVG: expect.any(Boolean),
        name: 'GAS Icon',
        creator: {
          address,
          name: expect.any(String),
        },
      })
    })

    it('Should get NFTs by address', async () => {
      const { items, nextCursor } = await ghostMarketNDSNeo3.getNftsByAddress({ address })

      items.forEach(nft =>
        expect(nft).toEqual({
          collectionImage: expect.any(String),
          id: expect.any(String),
          contractHash: expect.any(String),
          symbol: expect.any(String),
          collectionName: expect.any(String),
          image: expect.any(String),
          isSVG: expect.any(Boolean),
          name: expect.any(String),
          creator: {
            address: expect.any(String),
            name: expect.any(String),
          },
        })
      )

      expect(items.length).toBeGreaterThan(0)
      expect(nextCursor).toBeTruthy()
    })

    it('Should check if address has specific token when get by address', async () => {
      const { items } = await ghostMarketNDSNeo3.getNftsByAddress({ address })

      for (const { contractHash } of items) {
        const hasToken = await ghostMarketNDSNeo3.hasToken({ contractHash, address })

        expect(hasToken).toBeTruthy()
      }
    }, 60000)
  })
})
