import Transport from '@ledgerhq/hw-transport'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { NeonJsLedgerServiceNeoLegacy } from '../services/ledger/NeonJsLedgerServiceNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { BSNeoLegacy } from '../BSNeoLegacy'
import { BSKeychainHelper } from '@cityofzion/blockchain-service'

let ledgerService: NeonJsLedgerServiceNeoLegacy<'test'>
let transport: Transport
let bsNeoLegacy: BSNeoLegacy<'test'>

describe.skip('NeonJsLedgerServiceNeoLegacy', () => {
  beforeAll(async () => {
    const network = BSNeoLegacyConstants.TESTNET_NETWORK
    bsNeoLegacy = new BSNeoLegacy('test', network)

    transport = await TransportNodeHid.create()
    ledgerService = new NeonJsLedgerServiceNeoLegacy(bsNeoLegacy, async () => transport)
  })

  it('Should be able to get all accounts automatically', async () => {
    const accounts = await ledgerService.getAccounts(transport)
    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(bsNeoLegacy.bipDerivationPath, index),
        })
      )
    })
  })

  it('Should be able to get all accounts until index', async () => {
    const firstAccount = await ledgerService.getAccount(transport, 0)
    const accounts = await ledgerService.getAccounts(transport, {
      test: {
        [firstAccount.address]: 6,
      },
    })

    expect(accounts.length).toBe(7)
    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(bsNeoLegacy.bipDerivationPath, index),
        })
      )
    })
  })

  it('Should be able to get account', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    expect(account).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'publicKey',
        bipPath: BSKeychainHelper.getBipPath(bsNeoLegacy.bipDerivationPath, 0),
      })
    )
  })
})
