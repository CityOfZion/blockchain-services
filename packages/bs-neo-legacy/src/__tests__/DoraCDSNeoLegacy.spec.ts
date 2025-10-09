import { BSNeoLegacy } from '../BSNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { DoraBDSNeoLegacy } from '../services/blockchain-data/DoraBDSNeoLegacy'

let doraBDSNeoLegacy: DoraBDSNeoLegacy<'test'>

describe('DoraCDSNeoLegacy', () => {
  beforeEach(() => {
    const service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK)
    doraBDSNeoLegacy = new DoraBDSNeoLegacy(service)
  })

  it('Should be able to get unclaimed', async () => {
    const address = 'AQB8KjskTmRghCS3kMzxBNxKwT6b9kKM4v'
    const unclaimed = await doraBDSNeoLegacy.getUnclaimed(address)
    expect(unclaimed).toEqual(expect.any(String))
  })
})
