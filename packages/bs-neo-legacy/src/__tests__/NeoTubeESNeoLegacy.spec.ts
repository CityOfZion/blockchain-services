import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { NeoTubeESNeoLegacy } from '../services/explorer/NeoTubeESNeoLegacy'
import { Network } from '@cityofzion/blockchain-service'
import { TokenServiceNeoLegacy } from '../services/token/TokenServiceNeoLegacy'

let neoTubeESNeoLegacy: NeoTubeESNeoLegacy
const INVALID_NETWORK: Network = { id: '12345678', name: 'INVALID_NAME', url: 'INVALID_URL' }
const tokenService = new TokenServiceNeoLegacy()

describe('NeoTubeESNeoLegacy', () => {
  beforeEach(() => {
    const network = BSNeoLegacyConstants.DEFAULT_NETWORK

    neoTubeESNeoLegacy = new NeoTubeESNeoLegacy(network, tokenService)
  })

  it('Should return a transaction url by hash when call the buildTransactionUrl method', async () => {
    const hash = '0x0cd2d834d910dcb74c19bbbb1c986a94e292e1160f0d9f138b97ac950a5ac700'
    const url = neoTubeESNeoLegacy.buildTransactionUrl(hash)

    expect(url).toEqual(`https://neo2.neotube.io/transaction/${hash}`)
  })

  it('Should return a transaction url by normalized hash when call the buildTransactionUrl method', async () => {
    const hash = '0cd2d834d910dcb74c19bbbb1c986a94e292e1160f0d9f138b97ac950a5ac700'
    const url = neoTubeESNeoLegacy.buildTransactionUrl(hash)

    expect(url).toEqual(`https://neo2.neotube.io/transaction/0x${hash}`)
  })

  it('Should return undefined when call the getAddressTemplateUrl method with an invalid network', () => {
    neoTubeESNeoLegacy = new NeoTubeESNeoLegacy(INVALID_NETWORK, tokenService)

    const templateUrl = neoTubeESNeoLegacy.getAddressTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getTxTemplateUrl method with an invalid network', () => {
    neoTubeESNeoLegacy = new NeoTubeESNeoLegacy(INVALID_NETWORK, tokenService)

    const templateUrl = neoTubeESNeoLegacy.getTxTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return an address template URL (Mainnet) when call the getAddressTemplateUrl method with a Mainnet network', () => {
    const templateUrl = neoTubeESNeoLegacy.getAddressTemplateUrl()

    expect(templateUrl).toBe('https://neo2.neotube.io/address/{address}')
  })

  it('Should return a transaction template URL (Mainnet) when call the getTxTemplateUrl method with a Mainnet network', () => {
    const templateUrl = neoTubeESNeoLegacy.getTxTemplateUrl()

    expect(templateUrl).toBe('https://neo2.neotube.io/transaction/{txId}')
  })

  it('Should return undefined when call the getNftTemplateUrl method with an invalid network', () => {
    neoTubeESNeoLegacy = new NeoTubeESNeoLegacy(INVALID_NETWORK, tokenService)

    const templateUrl = neoTubeESNeoLegacy.getNftTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getContractTemplateUrl method with an invalid network', () => {
    neoTubeESNeoLegacy = new NeoTubeESNeoLegacy(INVALID_NETWORK, tokenService)

    const templateUrl = neoTubeESNeoLegacy.getContractTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return undefined when call the getContractTemplateUrl method with a Mainnet network', () => {
    const templateUrl = neoTubeESNeoLegacy.getNftTemplateUrl()

    expect(templateUrl).toBe(undefined)
  })

  it('Should return a transaction template URL (Mainnet) when call the getContractTemplateUrl method with a Mainnet network', () => {
    const templateUrl = neoTubeESNeoLegacy.getContractTemplateUrl()

    expect(templateUrl).toBe('https://neo2.neotube.io/asset/{hash}/page/1')
  })
})
