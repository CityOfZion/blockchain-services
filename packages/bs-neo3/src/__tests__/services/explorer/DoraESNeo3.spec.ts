import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'
import { DoraESNeo3 } from '../../../services/explorer/DoraESNeo3'
import { Network } from '@cityofzion/blockchain-service'

let doraESNeo3: DoraESNeo3
const INVALID_NETWORK: Network = { id: '1234', name: 'name', url: 'INVALID_URL' }

describe('DoraESNeo3', () => {
  beforeEach(() => {
    doraESNeo3 = new DoraESNeo3(BSNeo3Constants.DEFAULT_NETWORK)
  })

  it('Should return a transaction url', async () => {
    const hash = '0x775d824a54d4e9bebf3c522a7d8dede550348323d833ce68fbcf0ab953d579e8'
    const url = doraESNeo3.buildTransactionUrl(hash)

    expect(url).toEqual(`https://dora.coz.io/transaction/neo3/mainnet/${hash}`)
  })

  it('Should return a nft url', async () => {
    const contractHash = '0x577a51f7d39162c9de1db12a6b319c848e4c54e5'
    const tokenId = 'rAI='
    const url = doraESNeo3.buildNftUrl({ contractHash, tokenId })

    expect(url).toEqual(`https://dora.coz.io/nft/neo3/mainnet/${contractHash}/${tokenId}`)
  })

  it('Should return undefined when call the getAddressTemplateUrl method with an invalid network', () => {
    doraESNeo3 = new DoraESNeo3(INVALID_NETWORK)

    const templateUrl = doraESNeo3.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method with an invalid network', () => {
    doraESNeo3 = new DoraESNeo3(INVALID_NETWORK)

    const templateUrl = doraESNeo3.getTxTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = doraESNeo3.getAddressTemplateUrl()

    expect(templateUrl).toBe('https://dora.coz.io/address/neo3/mainnet/{address}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = doraESNeo3.getTxTemplateUrl()

    expect(templateUrl).toBe('https://dora.coz.io/transaction/neo3/mainnet/{txId}')
  })

  it('Should return an address template URL (Testnet) when call the getAddressTemplateUrl method with a Testnet network', () => {
    doraESNeo3 = new DoraESNeo3(BSNeo3Constants.TESTNET_NETWORKS[0])

    const templateUrl = doraESNeo3.getAddressTemplateUrl()

    expect(templateUrl).toBe('https://dora.coz.io/address/neo3/testnet/{address}')
  })

  it('Should return a transaction template URL (Testnet) when call the getTxTemplateUrl method with a Testnet network', () => {
    doraESNeo3 = new DoraESNeo3(BSNeo3Constants.TESTNET_NETWORKS[0])

    const templateUrl = doraESNeo3.getTxTemplateUrl()

    expect(templateUrl).toBe('https://dora.coz.io/transaction/neo3/testnet/{txId}')
  })
})
