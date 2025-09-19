import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { DoraESNeo3 } from '../../../services/explorer/DoraESNeo3'
import { BSCommonConstants, TBSNetwork } from '@cityofzion/blockchain-service'
import { IBSNeo3 } from '../../../types'
import { BSNeo3 } from '../../../BSNeo3'

let doraESNeo3: DoraESNeo3<'test'>
let service: IBSNeo3<'test'>

const INVALID_NETWORK: TBSNetwork = { id: '1234', name: 'name', url: 'INVALID_URL', type: 'custom' }

describe('DoraESNeo3', () => {
  beforeEach(() => {
    service = new BSNeo3('test', BSNeo3Constants.MAINNET_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)
  })

  it('Should return a transaction url', async () => {
    const hash = '0x775d824a54d4e9bebf3c522a7d8dede550348323d833ce68fbcf0ab953d579e8'
    const url = doraESNeo3.buildTransactionUrl(hash)

    expect(url).toEqual(`${BSCommonConstants.DORA_URL}/transaction/neo3/mainnet/${hash}`)
  })

  it('Should return a nft url', async () => {
    const collectionHash = '0x577a51f7d39162c9de1db12a6b319c848e4c54e5'
    const tokenHash = 'rAI='
    const url = doraESNeo3.buildNftUrl({ collectionHash, tokenHash })

    expect(url).toEqual(`${BSCommonConstants.DORA_URL}/nft/neo3/mainnet/${collectionHash}/${tokenHash}`)
  })

  it('Should return undefined when call the getAddressTemplateUrl method using an invalid network', () => {
    service = new BSNeo3('test', INVALID_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method using an invalid network', () => {
    service = new BSNeo3('test', INVALID_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getTxTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = doraESNeo3.getAddressTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/address/neo3/mainnet/{address}`)
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = doraESNeo3.getTxTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/transaction/neo3/mainnet/{txId}`)
  })

  it('Should return an address template URL (Testnet) when call the getAddressTemplateUrl method with a Testnet network', () => {
    service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getAddressTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/address/neo3/testnet/{address}`)
  })

  it('Should return a transaction template URL (Testnet) when call the getTxTemplateUrl method with a Testnet network', () => {
    service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getTxTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/transaction/neo3/testnet/{txId}`)
  })

  it('Should return undefined when call the getNftTemplateUrl method using an invalid network', () => {
    service = new BSNeo3('test', INVALID_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getNftTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getContractTemplateUrl method using an invalid network', () => {
    service = new BSNeo3('test', INVALID_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getContractTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getNftTemplateUrl method with a Mainnet network', () => {
    const templateUrl = doraESNeo3.getNftTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/nft/neo3/mainnet/{collectionHash}/{tokenHash}`)
  })

  it('Should return a transaction template URL (Mainnet) when call the getContractTemplateUrl method with a Mainnet network', () => {
    const templateUrl = doraESNeo3.getContractTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/contract/neo3/mainnet/{hash}`)
  })

  it('Should return an address template URL (Testnet) when call the getNftTemplateUrl method with a Testnet network', () => {
    service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getNftTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/nft/neo3/testnet/{collectionHash}/{tokenHash}`)
  })

  it('Should return a transaction template URL (Testnet) when call the getContractTemplateUrl method with a Testnet network', () => {
    service = new BSNeo3('test', BSNeo3Constants.TESTNET_NETWORK)
    doraESNeo3 = new DoraESNeo3(service)

    const templateUrl = doraESNeo3.getContractTemplateUrl()

    expect(templateUrl).toBe(`${BSCommonConstants.DORA_URL}/contract/neo3/testnet/{hash}`)
  })
})
