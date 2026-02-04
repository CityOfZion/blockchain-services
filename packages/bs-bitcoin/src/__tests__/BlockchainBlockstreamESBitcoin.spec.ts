import type { IExplorerService, TBuildNftUrlParams } from '@cityofzion/blockchain-service'
import type { IBSBitcoin } from '../types'
import { BlockchainBlockstreamESBitcoin } from '../services/explorer/BlockchainBlockstreamESBitcoin'
import { BSBitcoin } from '../BSBitcoin'
import { BSBitcoinConstants } from '../constants/BSBitcoinConstants'

describe('BlockchainBlockstreamESBitcoin', () => {
  const buildNftUrlParams: TBuildNftUrlParams = {
    tokenHash: 'fb8a9fab4a17c928b92d548575142281d6ebe492fe48ac796a25bb52ddf8f61bi0',
  }

  let service: IBSBitcoin<'test'>
  let explorerService: IExplorerService

  beforeEach(() => {
    service = new BSBitcoin('test')
    explorerService = new BlockchainBlockstreamESBitcoin(service)
  })

  it('Should be able to build the transaction URL', () => {
    const hash = '1234'
    const url = explorerService.buildTransactionUrl(hash)

    expect(url).toEqual(`https://blockchain.com/explorer/transactions/btc/${hash}`)
  })

  it('Should be able to build the transaction URL using Testnet', () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new BlockchainBlockstreamESBitcoin(service)

    const hash = '1234'
    const url = explorerService.buildTransactionUrl(hash)

    expect(url).toEqual(`https://blockstream.info/testnet/tx/${hash}`)
  })

  it('Should be able to build the NFT URL', () => {
    const url = explorerService.buildNftUrl(buildNftUrlParams)

    expect(url).toEqual(`https://uniscan.cc/inscription/${buildNftUrlParams.tokenHash}`)
  })

  it("Shouldn't be able to build the NFT URL using Testnet", () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new BlockchainBlockstreamESBitcoin(service)

    const url = explorerService.buildNftUrl(buildNftUrlParams)

    expect(url).toBe(undefined)
  })

  it("Shouldn't be able to build the contract URL", () => {
    const url = explorerService.buildContractUrl('')

    expect(url).toBe(undefined)
  })

  it('Should be able to get the address template URL', () => {
    const url = explorerService.getAddressTemplateUrl()

    expect(url).toBe('https://blockchain.com/explorer/addresses/btc/{address}')
  })

  it('Should be able to get the address template URL using Testnet', () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new BlockchainBlockstreamESBitcoin(service)

    const url = explorerService.getAddressTemplateUrl()

    expect(url).toBe('https://blockstream.info/testnet/address/{address}')
  })

  it('Should be able to get the TX template URL', () => {
    const url = explorerService.getTxTemplateUrl()

    expect(url).toBe('https://blockchain.com/explorer/transactions/btc/{txId}')
  })

  it('Should be able to get the TX template URL using Testnet', () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new BlockchainBlockstreamESBitcoin(service)

    const url = explorerService.getTxTemplateUrl()

    expect(url).toBe('https://blockstream.info/testnet/tx/{txId}')
  })

  it('Should be able to get the NFT template URL', () => {
    const url = explorerService.getNftTemplateUrl()

    expect(url).toBe('https://uniscan.cc/inscription/{tokenHash}')
  })

  it("Shouldn't be able to get the NFT template URL using Testnet", () => {
    service = new BSBitcoin('test', BSBitcoinConstants.TESTNET_NETWORK)
    explorerService = new BlockchainBlockstreamESBitcoin(service)

    const url = explorerService.getNftTemplateUrl()

    expect(url).toBe(undefined)
  })

  it("Shouldn't be able to get the contract template URL", () => {
    const url = explorerService.getContractTemplateUrl()

    expect(url).toBe(undefined)
  })
})
