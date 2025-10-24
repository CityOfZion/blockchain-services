import { BSNeoLegacy } from '../BSNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { DoraCDSNeoLegacy } from '../services/claim-data/DoraCDSNeoLegacy'

let doraCDSNeoLegacy: DoraCDSNeoLegacy<'test'>

describe('DoraCDSNeoLegacy', () => {
  beforeEach(() => {
    const service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK)
    doraCDSNeoLegacy = new DoraCDSNeoLegacy(service)
  })

  it('Should be able to get unclaimed', async () => {
    const address = 'AQB8KjskTmRghCS3kMzxBNxKwT6b9kKM4v'
    const unclaimed = await doraCDSNeoLegacy.getUnclaimed(address)
    expect(unclaimed).toEqual(expect.any(String))
  })
})
