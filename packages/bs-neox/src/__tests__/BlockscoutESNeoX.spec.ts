import { Network } from '@cityofzion/blockchain-service'
import { BlockscoutESNeoX } from '../services/explorer/BlockscoutESNeoX'
import { BSNeoXConstants } from '../constants/BSNeoXConstants'

describe('BlockscoutESNeoX', () => {
  const INVALID_NETWORK: Network = { id: '99999999', name: '', url: '' }
  let blockscoutESEthereum: BlockscoutESNeoX

  beforeEach(() => {
    blockscoutESEthereum = new BlockscoutESNeoX(BSNeoXConstants.DEFAULT_NETWORK)
  })

  it('Should return undefined when call the getAddressTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESNeoX(INVALID_NETWORK)

    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESNeoX(INVALID_NETWORK)

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
    blockscoutESEthereum = new BlockscoutESNeoX(INVALID_NETWORK)

    const templateUrl = blockscoutESEthereum.getNftTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getContractTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESNeoX(INVALID_NETWORK)

    const templateUrl = blockscoutESEthereum.getContractTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getNftTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getNftTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/token/{hash}/instance/{tokenId}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getContractTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getContractTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/address/{hash}')
  })
})
