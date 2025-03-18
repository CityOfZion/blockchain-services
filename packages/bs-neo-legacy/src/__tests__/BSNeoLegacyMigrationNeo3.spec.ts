import { BSNeoLegacy } from '../services/BSNeoLegacy'
import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import { CalculateToMigrateToNeo3ValuesParams, MigrateToNeo3Params } from '@cityofzion/blockchain-service'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'

describe('BSNeoLegacy - MigrationNeo3', () => {
  const keyEmptyBalance = process.env.NEO_LEGACY_EMPTY_BALANCE_PRIVATE_KEY!
  const keyWithBalance = process.env.NEO_LEGACY_WITH_BALANCE_PRIVATE_KEY!
  const [testnetNetwork] = BSNeoLegacyConstants.TESTNET_NETWORKS
  let serviceNeoLegacy: BSNeoLegacy<'neoLegacy'>
  let calculateParams: CalculateToMigrateToNeo3ValuesParams<'neoLegacy'>
  let migrateParams: MigrateToNeo3Params<'neoLegacy'>

  beforeEach(() => {
    serviceNeoLegacy = new BSNeoLegacy('neoLegacy', BSNeoLegacyConstants.DEFAULT_NETWORK)

    const account = serviceNeoLegacy.generateAccountFromKey(keyEmptyBalance)

    calculateParams = { account }
    migrateParams = { account, address: 'NXLMomSgyNeZRkeoxyPVJWjSfPb7xeiUJD' }
  })

  it("Shouldn't be able to migrate to Neo 3 when it's using a non Mainnet network", async () => {
    serviceNeoLegacy = new BSNeoLegacy('neoLegacy', testnetNetwork)

    await expect(serviceNeoLegacy.migrateToNeo3(migrateParams)).rejects.toThrow('Must use Mainnet network')
  })

  it("Shouldn't be able to migrate to Neo3 when it's not using an address", async () => {
    migrateParams.address = ''

    await expect(serviceNeoLegacy.migrateToNeo3(migrateParams)).rejects.toThrow('Must have address')
  })

  it("Shouldn't be able to migrate to Neo 3 when it's not using GAS or NEO enough", async () => {
    await expect(serviceNeoLegacy.migrateToNeo3(migrateParams)).rejects.toThrow('Must have at least 0.1 GAS or 2 NEO')
  })

  it("Shouldn't be able to calculate values to migrate to Neo 3 when it's using a non Mainnet network", async () => {
    serviceNeoLegacy = new BSNeoLegacy('neoLegacy', testnetNetwork)

    await expect(serviceNeoLegacy.calculateToMigrateToNeo3Values(migrateParams)).rejects.toThrow(
      'Must use Mainnet network'
    )
  })

  it("Shouldn't be able to calculate values to migrate to Neo 3 when it's not using GAS or NEO enough", async () => {
    await expect(serviceNeoLegacy.calculateToMigrateToNeo3Values(calculateParams)).rejects.toThrow(
      'Must have at least 0.1 GAS or 2 NEO'
    )
  })

  it.skip('Should be able to calculate values to migrate to Neo 3 when pass the correct params', async () => {
    const account = serviceNeoLegacy.generateAccountFromKey(keyWithBalance)

    calculateParams = { account }

    const response = await serviceNeoLegacy.calculateToMigrateToNeo3Values(calculateParams)

    expect(response).toEqual({
      gasMigrationTotalFees: expect.any(String),
      gasMigrationAmount: expect.any(String),
    })
  })

  it('Should throw an error when migrate to Neo 3 is from an empty balance address', async () => {
    const account = serviceNeoLegacy.generateAccountFromKey(keyEmptyBalance)

    migrateParams = { account, address: 'NQTRnAv45ax2avMDBjmEKEyNmc4Ms9zLjH' }

    await expect(serviceNeoLegacy.migrateToNeo3(migrateParams)).rejects.toThrow()
  })

  it.skip('Should create a successful migration when migrate to Neo 3 is called with correct GAS params', async () => {
    const account = serviceNeoLegacy.generateAccountFromKey(keyWithBalance)

    migrateParams = { account, address: 'NWs1nPJP8XkZxsNwuGYmikzQrEJcZBAUJN' }

    const txId = await serviceNeoLegacy.migrateToNeo3(migrateParams)

    expect(typeof txId).toBe('string')
    expect(txId.length).toBeGreaterThan(0)
  })

  it.skip('Should create a successful migration when migrate to Neo 3 is called with correct GAS params and using a Ledger', async () => {
    const transport = await TransportNodeHid.create()

    serviceNeoLegacy = new BSNeoLegacy('neoLegacy', BSNeoLegacyConstants.DEFAULT_NETWORK, async () => transport)

    const account = await serviceNeoLegacy.ledgerService.getAccount(transport, 0)

    migrateParams = { account, address: process.env.NEO3_MIGRATION_LEDGER_ADDRESS! }

    const txId = await serviceNeoLegacy.migrateToNeo3(migrateParams)

    expect(typeof txId).toBe('string')
    expect(txId.length).toBeGreaterThan(0)

    transport.close()
  }, 60_000)
})
