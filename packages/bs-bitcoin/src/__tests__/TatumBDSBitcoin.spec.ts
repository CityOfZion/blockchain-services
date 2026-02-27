import { TatumBDSBitcoin } from '../services/blockchain-data/TatumBDSBitcoin'
import { BSBitcoin } from '../BSBitcoin'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'
import type { IBSBitcoin } from '../types'
import type { IBlockchainDataService } from '@cityofzion/blockchain-service'

const expectedTransactions = expect.arrayContaining([
  {
    txId: expect.any(String),
    txIdUrl: expect.any(String),
    hex: expect.any(String),
    type: 'default',
    block: expect.any(Number),
    invocationCount: 0,
    notificationCount: 0,
    date: expect.any(String),
    networkFeeAmount: expect.any(String),
    systemFeeAmount: '0',
    events: expect.arrayContaining([
      expect.objectContaining({
        eventType: expect.stringMatching(/^(token|nft)$/),
        tokenType: 'native',
        token: BSBitcoinConstants.NATIVE_TOKEN,
        amount: expect.any(String),
      }),
    ]),
  },
])

const ordiHash = 'b61b0172d95e266c18aea0c624db987e971a5d6d4ebc2aaed85da4642d635735i0'
const betHash = '886eaf50fed7a2ceb3961fdf7b03efab1130b351ae71e106e071176efca8edf9i0'

let service: IBSBitcoin<'test'>
let blockchainDataService: IBlockchainDataService<'test'>

describe('TatumBDSBitcoin', () => {
  beforeEach(() => {
    service = new BSBitcoin('test')
    blockchainDataService = new TatumBDSBitcoin(service)
  })

  it("Shouldn't be able to get the contract", async () => {
    await expect(blockchainDataService.getContract('')).rejects.toThrow('Method not supported')
  })

  // TODO: it needs the paid plan for Xverse API
  it.skip('Should be able to get info of BTC, ORDI and .BET tokens', async () => {
    const btcToken = await blockchainDataService.getTokenInfo(BSBitcoinConstants.NATIVE_TOKEN.hash)
    const ordiToken = await blockchainDataService.getTokenInfo(ordiHash)
    const betToken = await blockchainDataService.getTokenInfo(betHash)

    expect(btcToken).toEqual(BSBitcoinConstants.NATIVE_TOKEN)

    expect(ordiToken).toEqual({
      symbol: 'ORDI',
      name: 'ORDI',
      hash: ordiHash,
      decimals: 18,
    })

    expect(betToken).toEqual({
      symbol: '.BET',
      name: '.BET',
      hash: betHash,
      decimals: 18,
    })
  })

  it('Should be able to get info of BTC token and not other tokens using Testnet', async () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    blockchainDataService = new TatumBDSBitcoin(service)

    const token = await blockchainDataService.getTokenInfo(BSBitcoinConstants.NATIVE_TOKEN.hash)

    expect(token).toEqual(BSBitcoinConstants.NATIVE_TOKEN)

    await expect(blockchainDataService.getTokenInfo(ordiHash)).rejects.toThrow('Only mainnet is supported')
    await expect(blockchainDataService.getTokenInfo(betHash)).rejects.toThrow('Only mainnet is supported')
  })

  // TODO: it needs the paid plan for Xverse API
  it.skip('Should be able to get the balances from address', async () => {
    const balances = await blockchainDataService.getBalance(
      'bc1pqhvy9kz07w7jw76nu89apvdd6mnddqg4uwgskhcmzfse2j8sx3jqjkykmr'
    )

    expect(balances.length > 1).toBe(true)
    expect(balances[0].token).toEqual(BSBitcoinConstants.NATIVE_TOKEN)
    expect(balances).toEqual(
      expect.arrayContaining([
        {
          amount: expect.any(String),
          token: expect.objectContaining({
            symbol: expect.any(String),
            name: expect.any(String),
            hash: expect.any(String),
            decimals: expect.any(Number),
          }),
        },
      ])
    )
  })

  it('Should be able to get the balances from address using Testnet', async () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    blockchainDataService = new TatumBDSBitcoin(service)

    const balances = await blockchainDataService.getBalance('tb1qnjvttgnl0gkxn99gmsd8g8zzpe7nckssmy56hu')

    expect(balances.length).toBe(1)
    expect(balances).toEqual(
      expect.arrayContaining([
        {
          amount: expect.any(String),
          token: BSBitcoinConstants.NATIVE_TOKEN,
        },
      ])
    )
  })

  it('Should be able to get the block height', async () => {
    const blockHeight = await blockchainDataService.getBlockHeight()

    expect(blockHeight).toEqual(expect.any(Number))
  })

  it('Should be able to get the block height using Testnet', async () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    blockchainDataService = new TatumBDSBitcoin(service)

    const blockHeight = await blockchainDataService.getBlockHeight()

    expect(blockHeight).toEqual(expect.any(Number))
  })

  it('Should be able to get the transactions by address', async () => {
    const address = '1BM1sAcrfV6d4zPKytzziu4McLQDsFC2Qc'
    const response = await blockchainDataService.getTransactionsByAddress({ address })
    const nextPageParams = response.nextPageParams
    const nextPageResponse = await blockchainDataService.getTransactionsByAddress({ address, nextPageParams })

    expect(response.transactions).toEqual(expectedTransactions)
    expect(response.nextPageParams).toEqual(expect.any(Number))
    expect(nextPageResponse.transactions).toEqual(expectedTransactions)
    expect(response.transactions[0]).not.toEqual(nextPageResponse.transactions[0])
  })

  it('Should be able to get the transactions with NFTs by address', async () => {
    const response = await blockchainDataService.getTransactionsByAddress({
      address: 'bc1pdaekjdgwg60n9zscqe8e92nqauxsx22wvtz9yv285ex005ck8u5q7crpxv',
    })

    expect(response.transactions).toEqual(expectedTransactions)
  })

  it('Should be able to get the transactions by address using Testnet', async () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    blockchainDataService = new TatumBDSBitcoin(service)

    const address = 'tb1qnjvttgnl0gkxn99gmsd8g8zzpe7nckssmy56hu'
    const response = await blockchainDataService.getTransactionsByAddress({ address })
    const nextPageParams = response.nextPageParams
    const nextPageResponse = await blockchainDataService.getTransactionsByAddress({ address, nextPageParams })

    expect(response.transactions).toEqual(expectedTransactions)
    expect(response.nextPageParams).toEqual(expect.any(Number))
    expect(nextPageResponse.transactions).toEqual(expectedTransactions)
    expect(response.transactions[0]).not.toEqual(nextPageResponse.transactions[0])
  })

  it('Should be able to get the transaction by hash', async () => {
    const hash = '92b55200a8adf94da5a4eb3f78dcbbfd0ed83fdd75aa46505a151a1ceeb4b62d'
    const transaction = await blockchainDataService.getTransaction(hash)

    expect(transaction).toEqual({
      txId: '92b55200a8adf94da5a4eb3f78dcbbfd0ed83fdd75aa46505a151a1ceeb4b62d',
      txIdUrl: expect.any(String),
      hex: expect.any(String),
      type: 'default',
      block: 933101,
      invocationCount: 0,
      notificationCount: 0,
      date: expect.any(String),
      networkFeeAmount: '0.000099',
      systemFeeAmount: '0',
      events: [
        {
          eventType: 'token',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: '1AR9sWV7ZR2C2ohGSDDKXipCfZ3RLGynHM',
          toUrl: expect.any(String),
          amount: '0.02460883',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          contractHash: BSBitcoinConstants.NATIVE_TOKEN.hash,
        },
      ],
    })
  })

  // TODO: it needs the paid plan for Xverse API
  it.skip('Should be able to get the NFT transaction by hash', async () => {
    const firstHash = '6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799'
    const firstNftTransaction = await blockchainDataService.getTransaction(firstHash)

    const secondHash = '050eeb6e675a8ebb43698e35614b904e1c349da3e5a6c00318fefff9af827a70'
    const secondNftTransaction = await blockchainDataService.getTransaction(secondHash)

    const thirdHash = '8fa670a8cd631d166de8dac591edfecd9aa1175a34d5ade2425b0e4d13308be0'
    const thirdNftTransaction = await blockchainDataService.getTransaction(thirdHash)

    expect(firstNftTransaction).toEqual({
      txId: firstHash,
      txIdUrl: expect.any(String),
      hex: expect.any(String),
      type: 'default',
      block: 767430,
      invocationCount: 0,
      notificationCount: 0,
      date: expect.any(String),
      networkFeeAmount: '0.00000322',
      systemFeeAmount: '0',
      events: [
        {
          eventType: 'nft',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: 'bc1qv8zhcjzpjw4m4tdyc5zn3dmax0z6rr6l78fevg',
          toUrl: expect.any(String),
          amount: '0.00009678',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          collectionHash: undefined,
          collectionHashUrl: undefined,
          collectionName: undefined,
          name: '0',
          nftImageUrl: expect.any(String),
          nftUrl: expect.any(String),
          tokenHash: `${firstHash}i0`,
        },
      ],
    })

    expect(secondNftTransaction).toEqual({
      txId: secondHash,
      txIdUrl: expect.any(String),
      hex: expect.any(String),
      type: 'default',
      block: 775608,
      invocationCount: 0,
      notificationCount: 0,
      date: expect.any(String),
      networkFeeAmount: '0.00003456',
      systemFeeAmount: '0',
      events: [
        {
          eventType: 'nft',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: 'bc1ptzgwz7n4fnpkz8t78rjmhmz0hq2yth4ugwlzg4yenrxpnvz2nwaqhwldp4',
          toUrl: expect.any(String),
          amount: '0.0001',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          collectionHash: 'bitcoin-punks',
          collectionHashUrl: expect.any(String),
          collectionName: 'Bitcoin Punks',
          name: 'Bitcoin Punk #4473',
          nftImageUrl: expect.any(String),
          nftUrl: expect.any(String),
          tokenHash: `${secondHash}i0`,
        },
      ],
    })

    expect(thirdNftTransaction).toEqual({
      txId: thirdHash,
      txIdUrl: expect.any(String),
      hex: expect.any(String),
      type: 'default',
      block: 935255,
      invocationCount: 0,
      notificationCount: 0,
      date: expect.any(String),
      networkFeeAmount: '0.00000625',
      systemFeeAmount: '0',
      events: [
        {
          eventType: 'nft',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: null,
          toUrl: undefined,
          amount: '0',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          collectionHash: undefined,
          collectionHashUrl: undefined,
          collectionName: undefined,
          name: '118342352',
          nftImageUrl: expect.any(String),
          nftUrl: expect.any(String),
          tokenHash: `${thirdHash}i0`,
        },
        {
          eventType: 'token',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: 'bc1pnaxqeayypaqew37seu5cszm2d4yfe98w5l8cxx5yruqurw7v4mxsagqa8v',
          toUrl: expect.any(String),
          amount: '0.0000033',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          contractHash: BSBitcoinConstants.NATIVE_TOKEN.hash,
        },
        {
          eventType: 'token',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: 'bc1pnaxqeayypaqew37seu5cszm2d4yfe98w5l8cxx5yruqurw7v4mxsagqa8v',
          toUrl: expect.any(String),
          amount: '0.0000033',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          contractHash: BSBitcoinConstants.NATIVE_TOKEN.hash,
        },
      ],
    })
  })

  it('Should be able to get the transaction by hash using Testnet', async () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    blockchainDataService = new TatumBDSBitcoin(service)

    const hash = 'bd9cde466116ef2917e031180bea8604cbc2a9fa60f36fb59be2278d0364b0ef'
    const transaction = await blockchainDataService.getTransaction(hash)

    expect(transaction).toEqual({
      txId: hash,
      txIdUrl: expect.any(String),
      hex: expect.any(String),
      type: 'default',
      block: 4838842,
      invocationCount: 0,
      notificationCount: 0,
      date: expect.any(String),
      networkFeeAmount: '0.00000141',
      systemFeeAmount: '0',
      events: [
        {
          eventType: 'token',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: 'tb1q27ayj6tdd2ut7pwvgw4n4xdrj5c3kyr2cpx3ml',
          toUrl: expect.any(String),
          amount: '0.00391851',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          contractHash: BSBitcoinConstants.NATIVE_TOKEN.hash,
        },
        {
          eventType: 'token',
          tokenType: 'native',
          from: undefined,
          fromUrl: undefined,
          to: 'tb1q020fdmr7vxt8cq6z29uay4cm83q4gfan9w933x',
          toUrl: expect.any(String),
          amount: '23.84418909',
          token: BSBitcoinConstants.NATIVE_TOKEN,
          contractHash: BSBitcoinConstants.NATIVE_TOKEN.hash,
        },
      ],
    })
  })
})
