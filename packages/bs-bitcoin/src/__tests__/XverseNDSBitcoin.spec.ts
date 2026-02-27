import { INftDataService } from '@cityofzion/blockchain-service'
import { BSBitcoin } from '../BSBitcoin'
import { XverseNDSBitcoin } from '../services/nft-data/XverseNDSBitcoin'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'

const address = 'bc1pvmppggephfqhmk83e68enajq5n7gc3xagzqugvmnxuq3rtp6tq4qddwker'
const defaultSize = 25

const expectedNfts = expect.arrayContaining([
  expect.objectContaining({
    hash: expect.any(String),
    name: expect.any(String),
    explorerUri: expect.stringMatching(/^https:\/\/uniscan\.cc\/inscription/),
    image: expect.stringMatching(/^https:\/\/ord\.xverse\.app\/thumbnail/),
    isSVG: expect.any(Boolean),
  }),
])

let nftDataService: INftDataService

describe('XverseNDSBitcoin', () => {
  beforeEach(() => {
    const service = new BSBitcoin('test')

    nftDataService = new XverseNDSBitcoin(service)
  })

  // TODO: it needs the paid plan for Xverse API
  it.skip('Should be able to get NFTs by address with cursor', async () => {
    let done = false
    let nextPageParams: string | undefined = undefined

    do {
      const response = await nftDataService.getNftsByAddress({ address, nextPageParams })

      nextPageParams = response.nextPageParams

      if (nextPageParams) {
        expect(nextPageParams).toEqual(expect.any(Number))
        expect(response.items).toEqual(expectedNfts)
        expect(response.items.length).toBe(defaultSize)
      } else {
        done = true

        expect(nextPageParams).toEqual(undefined)
        expect(response.items).toEqual(expectedNfts)
        expect(response.items.length).not.toBe(defaultSize)
      }
    } while (!done)
  })

  it("Shouldn't be able to get NFTs by address using Testnet", async () => {
    const service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)

    nftDataService = new XverseNDSBitcoin(service)

    await expect(nftDataService.getNftsByAddress({ address: 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6' })).rejects.toThrow(
      'Only mainnet is supported'
    )
  })

  // TODO: it needs the paid plan for Xverse API
  it.skip('Should be able to get NFT', async () => {
    const firstHash = 'be2dc33c73cb25644f4bf11327dca1a9ebe0e784d9a9d3a21de546d43cc50b70i13'
    const firstNft = await nftDataService.getNft({ tokenHash: firstHash })

    const secondHash = '5539517acd444e04dcee7776fe6759907babaf75771dcecfbae3dcc999d00761i0'
    const secondNft = await nftDataService.getNft({ tokenHash: secondHash })

    const thirdHash = 'e07c6571a341554b304905cd505a370d5c443350c09cd90f948b5d103d1e60a5i43'
    const thirdNft = await nftDataService.getNft({ tokenHash: thirdHash })

    expect(firstNft).toEqual({
      hash: firstHash,
      name: '93295784',
      explorerUri: `https://uniscan.cc/inscription/${firstHash}`,
      image: `https://ord.xverse.app/thumbnail/${firstHash}`,
      isSVG: false,
    })

    expect(secondNft).toEqual({
      hash: secondHash,
      name: 'Bitcoin Weirdos #3208',
      explorerUri: `https://uniscan.cc/inscription/${secondHash}`,
      image: `https://ord.xverse.app/thumbnail/${secondHash}`,
      isSVG: true,
      symbol: 'bitcoin-weirdos',
      collection: {
        name: 'Bitcoin Weirdos',
        hash: 'bitcoin-weirdos',
        url: 'https://unisat.io/market/collection?collectionId=bitcoin-weirdos',
      },
    })

    expect(thirdNft).toEqual({
      hash: thirdHash,
      name: 'Bitcoin Bro Bear #2257',
      explorerUri: `https://uniscan.cc/inscription/${thirdHash}`,
      image: `https://ord.xverse.app/thumbnail/${thirdHash}`,
      isSVG: false,
      symbol: 'btcbrobear',
      collection: {
        name: 'Bitcoin Bro Bear',
        hash: 'btcbrobear',
        url: 'https://unisat.io/market/collection?collectionId=btcbrobear',
      },
    })
  })

  it("Shouldn't be able to get NFT using Testnet", async () => {
    const service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)

    nftDataService = new XverseNDSBitcoin(service)

    await expect(nftDataService.getNft({ tokenHash: '' })).rejects.toThrow('Only mainnet is supported')
  })

  // TODO: it needs the paid plan for Xverse API
  it.skip('Should be able to verify if has token by address and collection', async () => {
    const hasToken = await nftDataService.hasToken({
      address: 'bc1p7c9z8a200rzge8usums3y5ktfpxrd2wmx9238fd8truzlsw06hrqs60dtc',
      collectionHash: 'btcbrobear',
    })

    expect(hasToken).toBe(true)
  })

  it("Shouldn't be able to verify if has token by address and collection using Testnet", async () => {
    const service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)

    nftDataService = new XverseNDSBitcoin(service)

    await expect(nftDataService.hasToken({ address: '', collectionHash: '' })).rejects.toThrow(
      'Only mainnet is supported'
    )
  })
})
