import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { GhostMarketNDSEthereum } from '../services/nft-data/GhostMarketNDSEthereum'

let ghostMarketNDSEthereum: GhostMarketNDSEthereum

describe('GhostMarketNDSEthereum', () => {
  describe('Ethereum Blockchain', () => {
    beforeAll(() => {
      ghostMarketNDSEthereum = new GhostMarketNDSEthereum(BSEthereumConstants.DEFAULT_NETWORK)
    })

    it('Should get NFT', async () => {
      const tokenHash = '379'
      const collectionHash = '0xeb3a9a839dfeeaf71db1b4ed6a8ae0ccb171b227'

      const nft = await ghostMarketNDSEthereum.getNft({
        collectionHash,
        tokenHash,
      })

      expect(nft).toEqual(
        expect.objectContaining({
          hash: tokenHash,
          collection: {
            hash: collectionHash,
            name: '"MOAR" by Joan Cornella',
            image: expect.any(String),
          },
          symbol: 'MOAR',
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

    it('Should get NFTS by address', async () => {
      const nfts = await ghostMarketNDSEthereum.getNftsByAddress({
        address: '0xd773c81a4a855556ce2f2372b12272710b95b26c',
      })

      expect(nfts.items.length).toBeGreaterThan(0)

      nfts.items.forEach(nft => {
        expect(nft).toEqual(
          expect.objectContaining({
            symbol: expect.any(String),
            hash: expect.any(String),
            collection: expect.objectContaining({
              hash: expect.any(String),
            }),
          })
        )
      })
    })

    it('Should check if address has specific Token', async () => {
      const address: string = '0xd773c81a4a855556ce2f2372b12272710b95b26c'

      const nfts = await ghostMarketNDSEthereum.getNftsByAddress({
        address: address,
      })

      const hasToken: boolean = await ghostMarketNDSEthereum.hasToken({
        address,
        collectionHash: nfts.items[0].collection.hash,
      })

      expect(hasToken).toBeTruthy()
    }, 60000)
  })

  describe('Neo X Blockchain', () => {
    beforeAll(() => {
      ghostMarketNDSEthereum = new GhostMarketNDSEthereum(BSEthereumConstants.NEOX_MAINNET_NETWORK)
    })

    it('Should get NEONAUTS NFT by contract hash and token id', async () => {
      const collectionHash = '0x337015aaa325c684b175591bfed6ea3d3c351bb3'
      const tokenHash = '101'

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
        isSVG: expect.any(Boolean),
        name: `NEONAUTS #${tokenHash}`,
        creator: {
          address: '0x2ee6a88f62e8645f671a1f889021b423b763f62c',
          name: undefined,
        },
      })
    })

    it('Should get GHOST NFT by contract hash and token id', async () => {
      const collectionHash = '0x0b53b5da7d0f275c31a6a182622bdf02474af253'
      const tokenHash = '6'

      const nft = await ghostMarketNDSEthereum.getNft({ collectionHash, tokenHash })

      expect(nft).toEqual({
        hash: tokenHash,
        collection: {
          hash: collectionHash,
          name: 'GhostMarket ERC721',
          image: undefined,
        },
        symbol: 'GHOST',
        image: expect.any(String),
        isSVG: expect.any(Boolean),
        name: 'BeTTyBooP',
        creator: {
          address: expect.any(String),
          name: 'bettyboop',
        },
      })
    })

    it('Should get NFTS by address', async () => {
      const { items, nextCursor } = await ghostMarketNDSEthereum.getNftsByAddress({
        address: '0x65541cf682dfd1b113a675204e24772c159bde60',
      })

      items.forEach(nft => {
        expect(nft).toMatchObject({
          hash: expect.any(String),
          symbol: expect.any(String),
          image: expect.any(String),
          isSVG: expect.any(Boolean),
          name: expect.any(String),
          collection: {
            hash: expect.any(String),
            name: expect.any(String),
            image: undefined,
          },
          creator: {
            address: expect.any(String),
            name: expect.any(String),
          },
        })
      })

      expect(items.length).toBeGreaterThan(0)
      expect(nextCursor).toBeTruthy()
    })

    it('Should check if address has specific token when get by address', async () => {
      const address = '0x65541cf682dfd1b113a675204e24772c159bde60'

      const nfts = await ghostMarketNDSEthereum.getNftsByAddress({ address })

      const hasToken = await ghostMarketNDSEthereum.hasToken({ address, collectionHash: nfts.items[0].collection.hash })

      expect(hasToken).toBeTruthy()
    }, 40000)
  })
})
