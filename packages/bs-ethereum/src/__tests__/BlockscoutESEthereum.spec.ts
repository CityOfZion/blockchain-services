import { BlockscoutESEthereum } from '../services/explorer/BlockscoutESEthereum'
import { TNetwork, TNetworkId } from '@cityofzion/blockchain-service'
import { IBSEthereum } from '../types'
import { BSEthereum } from '../BSEthereum'

const INVALID_NETWORK: TNetwork = { id: '99999999', name: '', url: '', type: 'mainnet' }
let blockscoutESEthereum: BlockscoutESEthereum<'test', TNetworkId>
let service: IBSEthereum<'test'>

describe('BlockscoutESEthereum', () => {
  beforeEach(() => {
    service = new BSEthereum('test', 'ethereum')
    blockscoutESEthereum = new BlockscoutESEthereum(service)
  })

  it('Should return undefined when call the getAddressTemplateUrl method with an invalid network', () => {
    service = new BSEthereum('test', 'ethereum', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESEthereum(service)

    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method with an invalid network', () => {
    service = new BSEthereum('test', 'ethereum', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESEthereum(service)

    const templateUrl = blockscoutESEthereum.getTxTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe('https://eth.blockscout.com/address/{address}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getTxTemplateUrl()

    expect(templateUrl).toBe('https://eth.blockscout.com/tx/{txId}')
  })

  it('Should return undefined when call the getNftTemplateUrl method with an invalid network', () => {
    service = new BSEthereum('test', 'ethereum', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESEthereum(service)

    const templateUrl = blockscoutESEthereum.getNftTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getContractTemplateUrl method with an invalid network', () => {
    service = new BSEthereum('test', 'ethereum', INVALID_NETWORK)
    blockscoutESEthereum = new BlockscoutESEthereum(service)

    const templateUrl = blockscoutESEthereum.getContractTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getNftTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getNftTemplateUrl()

    expect(templateUrl).toBe('https://eth.blockscout.com/token/{collectionHash}/instance/{tokenHash}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getContractTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getContractTemplateUrl()

    expect(templateUrl).toBe('https://eth.blockscout.com/address/{hash}')
  })
})
