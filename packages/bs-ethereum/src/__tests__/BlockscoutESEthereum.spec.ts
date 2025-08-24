import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { BlockscoutESEthereum } from '../services/explorer/BlockscoutESEthereum'
import { Network, TokenService } from '@cityofzion/blockchain-service'
import { TokenServiceEthereum } from '../services/token/TokenServiceEthereum'

const INVALID_NETWORK: Network = { id: '99999999', name: '', url: '' }
let blockscoutESEthereum: BlockscoutESEthereum
let tokenService: TokenService

describe('BlockscoutESEthereum', () => {
  beforeEach(() => {
    tokenService = new TokenServiceEthereum()
    blockscoutESEthereum = new BlockscoutESEthereum(BSEthereumConstants.DEFAULT_NETWORK, tokenService)
  })

  it('Should return undefined when call the getAddressTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESEthereum(INVALID_NETWORK, tokenService)

    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESEthereum(INVALID_NETWORK, tokenService)

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
    blockscoutESEthereum = new BlockscoutESEthereum(INVALID_NETWORK, tokenService)

    const templateUrl = blockscoutESEthereum.getNftTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getContractTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESEthereum(INVALID_NETWORK, tokenService)

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
