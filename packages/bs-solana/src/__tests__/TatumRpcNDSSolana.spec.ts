import { BSUtilsHelper } from '@cityofzion/blockchain-service'
import { BSSolana } from '../BSSolana'
import { TatumRpcNDSSolana } from '../services/nft-data/TatumRpcNDSSolana'

let tatumRpcNDSSolana: TatumRpcNDSSolana<'test'>

describe('TatumRpcNDSSolana.spec', () => {
  beforeEach(async () => {
    const service = new BSSolana('test')
    tatumRpcNDSSolana = new TatumRpcNDSSolana(service)

    await BSUtilsHelper.wait(2000) // Wait 2 seconds to avoid rate limit
  })

  it('Get NFT', async () => {
    const nft = await tatumRpcNDSSolana.getNft({
      collectionHash: 'J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w',
      tokenHash: 'CnB32foaJLZTc2LZACC9h9Mef97WLFkvBXVGuqcpGxLZ',
    })

    expect(nft).toEqual(
      expect.objectContaining({
        hash: 'CnB32foaJLZTc2LZACC9h9Mef97WLFkvBXVGuqcpGxLZ',
        collection: {
          hash: 'J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w',
          name: 'Mad Lads',
          image: 'https://madlads-collection.s3.us-west-2.amazonaws.com/_collection.png',
        },
        creator: {
          address: '5XvhfmRjwXkGp3jHGmaKpqeerNYjkuZZBYLVQYdeVcRv',
        },
        symbol: 'MAD',
        image: 'https://madlads.s3.us-west-2.amazonaws.com/images/2672.png',
        name: 'Mad Lads #2672',
      })
    )
  })

  it('Get NFTS by address', async () => {
    const nfts = await tatumRpcNDSSolana.getNftsByAddress({
      address: '47iUSSiZnp2grSXJNpN19qYQYLZ8Kdfxpf318w48Ydxo',
    })

    expect(nfts.items.length).toBeGreaterThan(0)
    nfts.items.forEach(nft => {
      expect(nft).toEqual(
        expect.objectContaining({
          symbol: expect.any(String),
          name: expect.any(String),
          hash: expect.any(String),
        })
      )
    })
  })

  it('Check if address has specific Token', async () => {
    const address: string = '2RtGg6fsFiiF1EQzHqbd66AhW7R5bWeQGpTbv2UMkCdW'

    const hasToken: boolean = await tatumRpcNDSSolana.hasToken({
      address,
      collectionHash: 'FCk24cq1pYhQo5MQYKHf5N9VnY8tdrToF7u6gvvsnGrn',
    })

    expect(hasToken).toBeTruthy()
  })
})
