import type { IExplorerService, TBuildNftUrlParams } from '@cityofzion/blockchain-service'
import type { IBSBitcoin } from '../types'
import { MempoolESBitcoin } from '../services/explorer/MempoolESBitcoin'
import { BSBitcoin } from '../BSBitcoin'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'

const buildNftUrlParams: TBuildNftUrlParams = {
  tokenHash: 'fb8a9fab4a17c928b92d548575142281d6ebe492fe48ac796a25bb52ddf8f61bi0',
}

let service: IBSBitcoin<'test'>
let explorerService: IExplorerService

describe('MempoolESBitcoin', () => {
  beforeEach(() => {
    service = new BSBitcoin('test')
    explorerService = new MempoolESBitcoin(service)
  })

  it('Should be able to build the address URL', () => {
    const address = 'bc1qwzrryqr3ja8w7hnja2spmkgfdcgvqwp5swz4af4ngsjecfz0w0pqud7k38'
    const url = explorerService.buildAddressUrl(address)

    expect(url).toBe(`https://mempool.space/address/${address}`)
  })

  it('Should be able to build the address URL using Testnet', () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new MempoolESBitcoin(service)

    const address = 'tb1qhdpfs3wzwywvxf0505h8dkyzmgtqp6grqte7lp'
    const url = explorerService.buildAddressUrl(address)

    expect(url).toBe(`https://mempool.space/testnet/address/${address}`)
  })

  it('Should be able to build the transaction URL', () => {
    const hash = '1234'
    const url = explorerService.buildTransactionUrl(hash)

    expect(url).toEqual(`https://mempool.space/tx/${hash}`)
  })

  it('Should be able to build the transaction URL using Testnet', () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new MempoolESBitcoin(service)

    const hash = '1234'
    const url = explorerService.buildTransactionUrl(hash)

    expect(url).toEqual(`https://mempool.space/testnet/tx/${hash}`)
  })

  it('Should be able to build the NFT URL', () => {
    const url = explorerService.buildNftUrl(buildNftUrlParams)

    expect(url).toEqual(`https://uniscan.cc/inscription/${buildNftUrlParams.tokenHash}`)
  })

  it("Shouldn't be able to build the NFT URL using Testnet", () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new MempoolESBitcoin(service)

    const url = explorerService.buildNftUrl(buildNftUrlParams)

    expect(url).toBe(undefined)
  })

  it("Shouldn't be able to build the contract URL", () => {
    const url = explorerService.buildContractUrl('')

    expect(url).toBe(undefined)
  })

  it('Should be able to get the address template URL', () => {
    const url = explorerService.getAddressTemplateUrl()

    expect(url).toBe('https://mempool.space/address/{address}')
  })

  it('Should be able to get the address template URL using Testnet', () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new MempoolESBitcoin(service)

    const url = explorerService.getAddressTemplateUrl()

    expect(url).toBe('https://mempool.space/testnet/address/{address}')
  })

  it('Should be able to get the TX template URL', () => {
    const url = explorerService.getTxTemplateUrl()

    expect(url).toBe('https://mempool.space/tx/{txId}')
  })

  it('Should be able to get the TX template URL using Testnet', () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new MempoolESBitcoin(service)

    const url = explorerService.getTxTemplateUrl()

    expect(url).toBe('https://mempool.space/testnet/tx/{txId}')
  })

  it('Should be able to get the NFT template URL', () => {
    const url = explorerService.getNftTemplateUrl()

    expect(url).toBe('https://uniscan.cc/inscription/{tokenHash}')
  })

  it("Shouldn't be able to get the NFT template URL using Testnet", () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new MempoolESBitcoin(service)

    const url = explorerService.getNftTemplateUrl()

    expect(url).toBe(undefined)
  })

  it("Shouldn't be able to get the contract template URL", () => {
    const url = explorerService.getContractTemplateUrl()

    expect(url).toBe(undefined)
  })
})
