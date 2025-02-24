import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import { BlockscoutESEthereum } from '../services/explorer/BlockscoutESEthereum'
import { Network } from '@cityofzion/blockchain-service'

const INVALID_NETWORK: Network = { id: '99999999', name: '', url: '' }
let blockscoutESEthereum: BlockscoutESEthereum

describe('BlockscoutESEthereum', () => {
  beforeEach(() => {
    blockscoutESEthereum = new BlockscoutESEthereum(BSEthereumConstants.DEFAULT_NETWORK)
  })

  it('Should return undefined when call the getAddressTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESEthereum(INVALID_NETWORK)

    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method with an invalid network', () => {
    blockscoutESEthereum = new BlockscoutESEthereum(INVALID_NETWORK)

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
})
