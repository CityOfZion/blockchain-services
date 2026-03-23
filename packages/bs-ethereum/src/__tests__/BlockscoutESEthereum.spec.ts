import { BlockscoutESEthereum } from '../services/explorer/BlockscoutESEthereum'
import type { TBSNetworkId } from '@cityofzion/blockchain-service'
import type { IBSEthereum } from '../types'
import { BSEthereum } from '../BSEthereum'

let blockscoutESEthereum: BlockscoutESEthereum<'ethereum', TBSNetworkId>
let service: IBSEthereum<'ethereum'>

describe('BlockscoutESEthereum', () => {
  beforeEach(() => {
    service = new BSEthereum('ethereum')
    blockscoutESEthereum = new BlockscoutESEthereum(service)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe('https://eth.blockscout.com/address/{address}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getTransactionTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getTransactionTemplateUrl()

    expect(templateUrl).toBe('https://eth.blockscout.com/tx/{txId}')
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
