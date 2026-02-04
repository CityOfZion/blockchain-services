import type { INftDataService } from '@cityofzion/blockchain-service'
import { BSBitcoin } from '../BSBitcoin'
import { HiroUniSatNDSBitcoin } from '../services/nft-data/HiroUniSatNDSBitcoin'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'

describe('HiroUniSatNDSBitcoin', () => {
  const address = 'bc1pvmppggephfqhmk83e68enajq5n7gc3xagzqugvmnxuq3rtp6tq4qddwker'
  const defaultSize = 60

  const expectedNfts = expect.arrayContaining([
    {
      hash: expect.any(String),
      name: expect.any(String),
      explorerUri: expect.stringMatching(/^https:\/\/uniscan\.cc\/inscription/),
      image: expect.stringMatching(/^https:\/\/static\.unisat\.space\/preview/),
      isSVG: expect.any(Boolean),
      isIframePreview: expect.any(Boolean),
      creator: {
        address: expect.any(String),
      },
    },
  ])

  let nftDataService: INftDataService

  beforeEach(() => {
    const service = new BSBitcoin('test')

    nftDataService = new HiroUniSatNDSBitcoin(service)
  })

  it('Should be able to get NFTs by address with cursor', async () => {
    const firstResponse = await nftDataService.getNftsByAddress({ address })

    expect(firstResponse.nextPageParams).toEqual(expect.any(Number))
    expect(firstResponse.items).toEqual(expectedNfts)
    expect(firstResponse.items.length).toBe(defaultSize)

    const secondResponse = await nftDataService.getNftsByAddress({ address, cursor: firstResponse.nextPageParams })

    expect(secondResponse.nextPageParams).toEqual(expect.any(Number))
    expect(secondResponse.items).toEqual(expectedNfts)
    expect(secondResponse.items.length).toBe(defaultSize)

    const thirdResponse = await nftDataService.getNftsByAddress({ address, cursor: secondResponse.nextPageParams })

    expect(thirdResponse.nextPageParams).toEqual(expect.any(Number))
    expect(thirdResponse.items).toEqual(expectedNfts)
    expect(thirdResponse.items.length).toBe(defaultSize)

    const fourthResponse = await nftDataService.getNftsByAddress({ address, cursor: thirdResponse.nextPageParams })

    expect(fourthResponse.nextPageParams).toBe(undefined)
    expect(fourthResponse.items).toEqual(expectedNfts)
    expect(fourthResponse.items.length).toBe(24)
  })

  it('Should be able to get NFTs by address with page', async () => {
    const firstResponse = await nftDataService.getNftsByAddress({ address, page: 1 })

    expect(firstResponse.nextPageParams).toEqual(expect.any(Number))
    expect(firstResponse.items).toEqual(expectedNfts)
    expect(firstResponse.items.length).toBe(defaultSize)

    const secondResponse = await nftDataService.getNftsByAddress({ address, page: 2 })

    expect(secondResponse.nextPageParams).toEqual(expect.any(Number))
    expect(secondResponse.items).toEqual(expectedNfts)
    expect(secondResponse.items.length).toBe(defaultSize)

    const thirdResponse = await nftDataService.getNftsByAddress({ address, page: 3 })

    expect(thirdResponse.nextPageParams).toEqual(expect.any(Number))
    expect(thirdResponse.items).toEqual(expectedNfts)
    expect(thirdResponse.items.length).toBe(defaultSize)

    const fourthResponse = await nftDataService.getNftsByAddress({ address, page: 4 })

    expect(fourthResponse.nextPageParams).toBe(undefined)
    expect(fourthResponse.items).toEqual(expectedNfts)
    expect(fourthResponse.items.length).toBe(24)
  })

  it('Should be able to get NFTs by address with size, cursor and page', async () => {
    const size = 2
    const firstResponse = await nftDataService.getNftsByAddress({ address, size })

    expect(firstResponse.items.length).toBe(size)
    expect(firstResponse.nextPageParams).toEqual(expect.any(Number))

    const secondCursorResponse = await nftDataService.getNftsByAddress({
      address,
      size,
      cursor: firstResponse.nextPageParams,
    })

    const secondPageResponse = await nftDataService.getNftsByAddress({ address, size, page: 2 })

    expect(secondCursorResponse).toEqual(secondPageResponse)
    expect(secondCursorResponse.items.length).toBe(size)
    expect(secondPageResponse.items.length).toBe(size)
  })

  it("Shouldn't be able to get NFTs by address with invalid size", async () => {
    await expect(nftDataService.getNftsByAddress({ address, size: 0 })).rejects.toThrow(
      'Size should be between 1 and 60'
    )

    await expect(nftDataService.getNftsByAddress({ address, size: 61 })).rejects.toThrow(
      'Size should be between 1 and 60'
    )
  })

  it("Shouldn't be able to get NFTs by address using Testnet", async () => {
    const service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)

    nftDataService = new HiroUniSatNDSBitcoin(service)

    await expect(nftDataService.getNftsByAddress({ address: 'NNmTVFrSPhe7zjgN6iq9cLgXJwLZziUKV6' })).rejects.toThrow(
      'Only mainnet is supported'
    )
  })

  it('Should be able to get NFT', async () => {
    const firstHash = 'be2dc33c73cb25644f4bf11327dca1a9ebe0e784d9a9d3a21de546d43cc50b70i13'
    const firstNft = await nftDataService.getNft({
      tokenHash: firstHash,
      collectionHash: '',
    })

    const secondHash = '5539517acd444e04dcee7776fe6759907babaf75771dcecfbae3dcc999d00761i0'
    const secondNft = await nftDataService.getNft({
      tokenHash: secondHash,
      collectionHash: '',
    })

    expect(firstNft).toEqual({
      hash: firstHash,
      name: '93295784',
      explorerUri: `https://uniscan.cc/inscription/${firstHash}`,
      image: `https://static.unisat.space/preview/${firstHash}`,
      isSVG: false,
      isIframePreview: true,
      creator: {
        address: 'bc1p8vuw2sukuw5v0ywz4t0hpd98kku23ysy9n9ccn9n4c97ul49r64s5kfskg',
      },
    })

    expect(secondNft).toEqual({
      hash: secondHash,
      name: '93259791',
      explorerUri: `https://uniscan.cc/inscription/${secondHash}`,
      image: `https://static.unisat.space/preview/${secondHash}`,
      isSVG: true,
      isIframePreview: true,
      creator: {
        address: 'bc1q2afcvw6aegfzlkysrzffteaajqgc3x72azrna8',
      },
    })
  })

  it("Shouldn't be able to get NFT using Testnet", async () => {
    const service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)

    nftDataService = new HiroUniSatNDSBitcoin(service)

    await expect(nftDataService.getNft({ tokenHash: '', collectionHash: '' })).rejects.toThrow(
      'Only mainnet is supported'
    )
  })

  it("Shouldn't be able to verify if has token", async () => {
    await expect(nftDataService.hasToken({ address: '', collectionHash: '' })).rejects.toThrow(
      'There is no collection hash on Bitcoin'
    )
  })
})
