import { ClaimServiceNeoLegacy } from '../services/claim/ClaimServiceNeoLegacy'

let claimServiceNeoLegacy: ClaimServiceNeoLegacy

describe('ClaimServiceNeoLegacy', () => {
  beforeEach(() => {
    claimServiceNeoLegacy = new ClaimServiceNeoLegacy()
  })

  it('Should be able to get unclaimed GAS with an address', async () => {
    const unclaimedGas = await claimServiceNeoLegacy.getUnclaimed('AQB8KjskTmRghCS3kMzxBNxKwT6b9kKM4v')

    expect(unclaimedGas).toEqual('365.08246065')
  })
})
