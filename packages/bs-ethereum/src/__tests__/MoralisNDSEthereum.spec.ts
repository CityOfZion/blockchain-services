import type { TBSNetworkId } from '@cityofzion/blockchain-service'
import { BSEthereum } from '../BSEthereum'
import { MoralisNDSEthereum } from '../services/nft-data/MoralisNDSEthereum'

let service: BSEthereum<'ethereum', TBSNetworkId>
let moralisNDSEthereum: MoralisNDSEthereum<'ethereum', TBSNetworkId>

describe('MoralisNDSEthereum', () => {
  beforeAll(() => {
    service = new BSEthereum('ethereum')
    moralisNDSEthereum = new MoralisNDSEthereum(service)
  })

  it('Get NFT', async () => {
    const nft = await moralisNDSEthereum.getNft({
      collectionHash: '0xeb3a9a839dfeeaf71db1b4ed6a8ae0ccb171b227',
      tokenHash: '379',
    })

    expect(nft).toEqual(
      expect.objectContaining({
        collection: {
          hash: '0xeb3a9a839dfeeaf71db1b4ed6a8ae0ccb171b227',
          name: 'MOAR by Joan Cornella',
          url: expect.any(String),
        },
        explorerUri: expect.any(String),
        hash: '379',
        name: 'MOAR #379',
        image: expect.any(String),
        symbol: 'MOAR',
      })
    )
  })

  it('Get NFTs by address', async () => {
    const nfts = await moralisNDSEthereum.getNftsByAddress({
      address: '0xd1bd05a8dFF1d47A309179E3bcC170bEB5ee2843',
    })

    expect(nfts.items.length).toBeGreaterThan(0)
    nfts.items.forEach(nft => {
      expect(nft).toEqual(
        expect.objectContaining({
          symbol: expect.any(String),
          hash: expect.any(String),
        })
      )
    })
  })

  it('Should return true for collections already owned by address', async () => {
    const address: string = '0xd773c81a4a855556ce2f2372b12272710b95b26c'
    const nfts = await moralisNDSEthereum.getNftsByAddress({ address })

    for (const { collection } of nfts.items) {
      const hasToken = await moralisNDSEthereum.hasToken({
        address,
        collectionHash: collection!.hash,
      })

      expect(hasToken).toBe(true)
    }
  })
})
