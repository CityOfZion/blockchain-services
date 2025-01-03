import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { NeoTubeESNeoLegacy } from '../services/explorer/NeoTubeESNeoLegacy'

let neoTubeESNeoLegacy: NeoTubeESNeoLegacy

describe('NeoTubeESNeoLegacy', () => {
  beforeAll(() => {
    const network = BSNeoLegacyConstants.DEFAULT_NETWORK

    neoTubeESNeoLegacy = new NeoTubeESNeoLegacy(network)
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
})
