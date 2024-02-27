import { GhostMarketNDSNeo3 } from '../GhostMarketNDSNeo3'

let ghostMarketNDSNeo3: GhostMarketNDSNeo3

describe('GhostMarketNDSNeo3', () => {
  beforeAll(() => {
    ghostMarketNDSNeo3 = new GhostMarketNDSNeo3('mainnet')
  })

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
})
