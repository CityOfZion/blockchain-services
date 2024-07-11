import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { LedgerServiceNeo3 } from '../LedgerServiceNeo3'
import { DoraBDSNeo3 } from '../DoraBDSNeo3'
import { DEFAULT_URL_BY_NETWORK_TYPE, TOKENS } from '../constants'
import Transport from '@ledgerhq/hw-transport'

let ledgerService: LedgerServiceNeo3
let transport: Transport

describe.skip('LedgerServiceNeo3', () => {
  beforeAll(async () => {
    transport = await TransportNodeHid.create()
    const gasToken = TOKENS.mainnet.find(token => token.symbol === 'GAS')!
    const blockchainDataService = new DoraBDSNeo3(
      { id: 'mainnet', name: 'mainnet', url: DEFAULT_URL_BY_NETWORK_TYPE.mainnet },
      gasToken,
      gasToken
    )

    ledgerService = new LedgerServiceNeo3(blockchainDataService, async () => transport)
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
          derivationIndex: index,
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
        derivationIndex: 0,
      })
    )
  })
})
