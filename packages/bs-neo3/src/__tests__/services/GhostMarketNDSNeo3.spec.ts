import { BSNeo3 } from '../../BSNeo3'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { GhostMarketNDSNeo3 } from '../../services/nft-data/GhostMarketNDSNeo3'

let ghostMarketNDSNeo3: GhostMarketNDSNeo3<'test'>

describe('GhostMarketNDSNeo3', () => {
  beforeAll(() => {
    const service = new BSNeo3('test', BSNeo3Constants.MAINNET_NETWORK)
    ghostMarketNDSNeo3 = new GhostMarketNDSNeo3(service)
  })

  it('Should get TTM NFT by contract hash and token id', async () => {
    const nft = await ghostMarketNDSNeo3.getNft({
      collectionHash: '0xaa4fb927b3fe004e689a278d188689c9f050a8b2',
      tokenHash: 'SVBLTUYxMTY1',
    })

    expect(nft).toEqual(
      expect.objectContaining({
        hash: 'SVBLTUYxMTY1',
        symbol: 'TTM',
        collection: {
          hash: '0xaa4fb927b3fe004e689a278d188689c9f050a8b2',
          name: 'TOTHEMOON',
          image: expect.any(String),
        },
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

  it('Should get GHOST NFT by contract hash and token id', async () => {
    const collectionHash = '0x577a51f7d39162c9de1db12a6b319c848e4c54e5'
    const tokenHash = '7wA='
    const nft = await ghostMarketNDSNeo3.getNft({ collectionHash, tokenHash })

    expect(nft).toEqual({
      hash: tokenHash,
      collection: {
        hash: collectionHash,
        name: 'GHOST',
        image: expect.any(String),
      },
      symbol: 'GHOST',
      image: expect.any(String),
      isSVG: expect.any(Boolean),
      explorerUri: expect.any(String),
      name: 'GAS Icon',
      creator: {
        address: expect.any(String),
        name: expect.any(String),
      },
    })
  })

  it('Should get NFTS by address', async () => {
    const nfts = await ghostMarketNDSNeo3.getNftsByAddress({
      address: 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6',
    })
    expect(nfts.items.length).toBeGreaterThan(0)
    nfts.items.forEach(nft => {
      expect(nft).toEqual(
        expect.objectContaining({
          symbol: expect.any(String),
          hash: expect.any(String),
          collection: {
            hash: expect.any(String),
            name: expect.any(String),
            image: expect.anything(),
          },
        })
      )
    })
  })

  it('Should check if address has specific Token', async () => {
    const address: string = 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6'

    const nfts = await ghostMarketNDSNeo3.getNftsByAddress({
      address: address,
    })

    const hasToken: boolean = await ghostMarketNDSNeo3.hasToken({
      address,
      collectionHash: nfts.items[0].collection.hash,
    })

    expect(hasToken).toBeTruthy()
  })
})
