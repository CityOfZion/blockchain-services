import { BlockscoutESNeoX } from '../services/explorer/BlockscoutESNeoX'
import { BSNeoX } from '../BSNeoX'

let blockscoutESEthereum: BlockscoutESNeoX

describe('BlockscoutESNeoX', () => {
  beforeEach(() => {
    const service = new BSNeoX()
    blockscoutESEthereum = new BlockscoutESNeoX(service)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getAddressTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/address/{address}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getTransactionTemplateUrl method with a Mainnet network', () => {
    const templateUrl = blockscoutESEthereum.getTransactionTemplateUrl()

    expect(templateUrl).toBe('https://xexplorer.neo.org/tx/{txId}')
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
