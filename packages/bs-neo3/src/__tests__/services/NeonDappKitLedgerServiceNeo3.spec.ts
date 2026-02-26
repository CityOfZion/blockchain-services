import Transport from '@ledgerhq/hw-transport'
import { NeonDappKitLedgerServiceNeo3 } from '../../services/ledger/NeonDappKitLedgerServiceNeo3'
import { BSNeo3 } from '../../BSNeo3'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeo3Constants } from '../../constants/BSNeo3Constants'
import { BSKeychainHelper } from '@cityofzion/blockchain-service'

let ledgerService: NeonDappKitLedgerServiceNeo3<'test'>
let transport: Transport
let bsNeo3: BSNeo3<'test'>

describe.skip('NeonDappKitLedgerServiceNeo3', () => {
  beforeAll(async () => {
    const network = BSNeo3Constants.TESTNET_NETWORK
    bsNeo3 = new BSNeo3('test', network)

    transport = await TransportNodeHid.create()
    ledgerService = new NeonDappKitLedgerServiceNeo3(bsNeo3, async () => transport)
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
          bipPath: BSKeychainHelper.getBipPath(bsNeo3.bipDerivationPath, index),
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
          bipPath: BSKeychainHelper.getBipPath(bsNeo3.bipDerivationPath, index),
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
        bipPath: BSKeychainHelper.getBipPath(bsNeo3.bipDerivationPath, 0),
      })
    )
  })
})
