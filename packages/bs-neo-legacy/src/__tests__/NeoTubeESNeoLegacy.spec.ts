import { NeoTubeESNeoLegacy } from '../NeoTubeESNeoLegacy'

let neoTubeESNeoLegacy: NeoTubeESNeoLegacy

describe('NeoTubeESNeoLegacy', () => {
  beforeAll(() => {
    neoTubeESNeoLegacy = new NeoTubeESNeoLegacy('mainnet')
  })
  it('Should return a transaction url', async () => {
    const hash = '0x0cd2d834d910dcb74c19bbbb1c986a94e292e1160f0d9f138b97ac950a5ac700'
    const url = neoTubeESNeoLegacy.buildTransactionUrl(hash)

    expect(url).toEqual(`https://neo2.neotube.io/transaction/${hash}`)
  })
})
