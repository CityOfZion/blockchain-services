import { DoraESNeoLegacy } from '../DoraESNeoLegacy'

let doraESNeoLegacy: DoraESNeoLegacy

describe('doraESNeoLegacy', () => {
  beforeAll(() => {
    doraESNeoLegacy = new DoraESNeoLegacy('mainnet')
  })
  it('Should return a transaction url', async () => {
    const hash = '0x0cd2d834d910dcb74c19bbbb1c986a94e292e1160f0d9f138b97ac950a5ac700'
    const url = doraESNeoLegacy.buildTransactionUrl(hash)

    expect(url).toEqual(`https://dora.coz.io/transaction/neo2/mainnet/${hash}`)
  })
})
