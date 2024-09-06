import Transport from '@ledgerhq/hw-transport'
import { NeonDappKitLedgerServiceNeo3 } from '../../../services/ledger/NeonDappKitLedgerServiceNeo3'
import { BSNeo3 } from '../../../BSNeo3'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { BSNeo3Constants } from '../../../constants/BSNeo3Constants'

let ledgerService: NeonDappKitLedgerServiceNeo3
let transport: Transport
let bsNeo3: BSNeo3

describe.skip('NeonDappKitLedgerServiceNeo3.spec', () => {
  beforeAll(async () => {
    const network = BSNeo3Constants.TESTNET_NETWORKS[0]!
    bsNeo3 = new BSNeo3('neo3', network)

    transport = await TransportNodeHid.create()
    ledgerService = new NeonDappKitLedgerServiceNeo3(bsNeo3, async () => transport)
  }, 60000)

  it('Should be able to get all accounts', async () => {
    const accounts = await ledgerService.getAccounts(transport)
    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bip44Path: bsNeo3.bip44DerivationPath.replace('?', index.toString()),
        })
      )
    })
  }, 60000)

  it('Should be able to get account', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    expect(account).toEqual(
      expect.objectContaining({
        address: expect.any(String),
        key: expect.any(String),
        type: 'publicKey',
        bip44Path: bsNeo3.bip44DerivationPath.replace('?', '0'),
      })
    )
  }, 60000)
})
