import { BSNeo3 } from '../BSNeo3'

let bsNeo3: BSNeo3
const address = "NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6"
describe('Ghostmarket', () => {
  beforeAll(() => {
    bsNeo3 = new BSNeo3('neo3', { type: 'mainnet', url: 'https://testnet1.neo.coz.io:443' })
  })
  it("Get NFT", async () => {
    const nft = await bsNeo3.getNFT("SVBLTUYxMTY1", "0xaa4fb927b3fe004e689a278d188689c9f050a8b2")
    expect(nft).toEqual(
      expect.objectContaining(
        {
          id: expect.any(String),
          contractHash: expect.any(String),
          symbol: expect.any(String),
        }
      )
    )
  })
  it("Get NFTS", async () => {
    const nfts = await bsNeo3.getNFTS(address)
    expect(nfts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining(
          {
            collectionImage: expect.any(String),
            collectionName: expect.any(String),
            image: expect.any(String),
            name: expect.any(String),
            symbol: expect.any(String),
            id: expect.any(String),
            contractHash: expect.any(String),
            isSVG: expect.any(Boolean)
          }
        )
      ])
    )
  })
})
