import Transport from '@ledgerhq/hw-transport'
import { NeonDappKitLedgerServiceNeo3 } from '../services/ledger/NeonDappKitLedgerServiceNeo3'
import { BSNeo3 } from '../BSNeo3'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeo3Constants } from '../constants/BSNeo3Constants'
import { BSKeychainHelper } from '@cityofzion/blockchain-service'

let bsNeo3: BSNeo3
let transport: Transport
let ledgerService: NeonDappKitLedgerServiceNeo3

describe.skip('NeonDappKitLedgerServiceNeo3', () => {
  beforeAll(async () => {
    bsNeo3 = new BSNeo3(BSNeo3Constants.TESTNET_NETWORK)
    transport = await TransportNodeHid.create()
    ledgerService = new NeonDappKitLedgerServiceNeo3(bsNeo3, async () => transport)
  })

  it('Should be able to get all accounts automatically', async () => {
    const accounts = await ledgerService.getAccounts(transport)

    expect(accounts.length).toBeGreaterThan(1)
    expect(accounts).toEqual(
      accounts.map((_, index) =>
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(bsNeo3.bipDerivationPath, index),
        })
      )
    )
  })

  it('Should be able to get all accounts until index', async () => {
    const firstAccount = await ledgerService.getAccount(transport, 0)
    const accounts = await ledgerService.getAccounts(transport, {
      neo3: {
        [firstAccount.address]: 6,
      },
    })

    expect(accounts.length).toBe(7)
    expect(accounts).toEqual(
      accounts.map((_, index) =>
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(bsNeo3.bipDerivationPath, index),
        })
      )
    )
  })

  it('Should be able to get account', async () => {
    const account = await ledgerService.getAccount(transport, 0)

    expect(account).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'publicKey',
        bipPath: BSKeychainHelper.getBipPath(bsNeo3.bipDerivationPath, 0),
      })
    )
  })
})
