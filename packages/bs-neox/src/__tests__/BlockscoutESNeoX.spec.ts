import { BlockscoutESNeoX } from '../services/explorer/BlockscoutESNeoX'
import { BSNeoX } from '../BSNeoX'
import { TNetwork } from '@cityofzion/blockchain-service'

const INVALID_NETWORK: TNetwork = { id: '99999999', name: '', url: '', type: 'mainnet' }
let blockscoutESEthereum: BlockscoutESNeoX<'test'>

describe('BlockscoutESNeoX', () => {
  beforeEach(() => {
    const service = new BSNeoX('test')
    blockscoutESEthereum = new BlockscoutESNeoX(service)
  })

  it('Should return undefined when call the getAddressTemplateUrl method with an invalid network', () => {
    const service = new BSNeoX('test', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESNeoX(service)

    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method with an invalid network', () => {
    const service = new BSNeoX('test', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESNeoX(service)

    const templateUrl = blockscoutESEthereum.getTxTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/address/{address}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getTxTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/tx/{txId}')
  })

  it('Should return undefined when call the getNftTemplateUrl method with an invalid network', () => {
    const service = new BSNeoX('test', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESNeoX(service)

    const templateUrl = blockscoutESEthereum.getNftTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getContractTemplateUrl method with an invalid network', () => {
    const service = new BSNeoX('test', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESNeoX(service)

    const templateUrl = blockscoutESEthereum.getContractTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getNftTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getNftTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/token/{collectionHash}/instance/{tokenHash}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getContractTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getContractTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/address/{hash}')
  })
})
