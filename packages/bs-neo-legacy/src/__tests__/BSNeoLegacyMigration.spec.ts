import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { TBSAccount, TBalanceResponse } from '@cityofzion/blockchain-service'
import { BSNeoLegacy } from '../BSNeoLegacy'
import { Neo3NeoLegacyMigrationService } from '../services/migration/Neo3NeoLegacyMigrationService'
import { TNeo3NeoLegacyMigrationNeoLegacyAmounts } from '../types'

const neo3Address = 'NWs1nPJP8XkZxsNwuGYmikzQrEJcZBAUJN'

let neo3NeoLegacyMigrationService: Neo3NeoLegacyMigrationService<'test'>
let account: TBSAccount<'test'>
let service: BSNeoLegacy<'test'>

describe('BSNeoLegacy - Migration', () => {
  beforeEach(async () => {
    service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK)
    neo3NeoLegacyMigrationService = new Neo3NeoLegacyMigrationService(service)
    account = service.generateAccountFromKey(process.env.NEO_LEGACY_WITH_BALANCE_PRIVATE_KEY)
  })

  it('Should be able to calculate neo legacy migration values for empty balance', async () => {
    expect(neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts([])).toEqual({
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: undefined,
      neoBalance: undefined,
    })

    const balances: TBalanceResponse[] = [
      { amount: '0', token: BSNeoLegacyConstants.NEO_ASSET },
      { amount: '0', token: BSNeoLegacyConstants.GAS_ASSET },
    ]

    expect(neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts(balances)).toEqual({
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: balances[1],
      neoBalance: balances[0],
    })
  })

  it('Should be able to calculate neo legacy migration values for no minimum balances', async () => {
    const balances: TBalanceResponse[] = [
      { amount: '1', token: BSNeoLegacyConstants.NEO_ASSET },
      { amount: '0.0001', token: BSNeoLegacyConstants.GAS_ASSET },
    ]
    expect(neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts(balances)).toEqual({
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: balances[1],
      neoBalance: balances[0],
    })
  })

  it('Should be able to calculate neo legacy migration values', async () => {
    const gasBalance: TBalanceResponse = { amount: '1', token: BSNeoLegacyConstants.GAS_ASSET }
    expect(neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts([gasBalance])).toEqual({
      hasEnoughNeoBalance: false,
      hasEnoughGasBalance: true,
      neoBalance: undefined,
      gasBalance,
    })

    const neoBalance = { amount: '4', token: BSNeoLegacyConstants.NEO_ASSET }
    expect(neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts([neoBalance])).toEqual({
      hasEnoughNeoBalance: true,
      hasEnoughGasBalance: false,
      neoBalance,
      gasBalance: undefined,
    })

    expect(neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts([gasBalance, neoBalance])).toEqual({
      hasEnoughNeoBalance: true,
      hasEnoughGasBalance: true,
      neoBalance,
      gasBalance,
    })
  })

  it('Should be able to calculate neo3 values for empty balance', async () => {
    const neoBalance = { amount: '0', token: BSNeoLegacyConstants.NEO_ASSET }
    const gasBalance = { amount: '0', token: BSNeoLegacyConstants.GAS_ASSET }

    expect(
      neo3NeoLegacyMigrationService.calculateNeo3MigrationAmounts({
        hasEnoughNeoBalance: false,
        hasEnoughGasBalance: false,
        neoBalance: neoBalance,
      })
    ).toEqual({
      gasMigrationReceiveAmount: undefined,
      gasMigrationTotalFees: undefined,
      neoMigrationReceiveAmount: undefined,
      neoMigrationTotalFees: undefined,
    })

    expect(
      neo3NeoLegacyMigrationService.calculateNeo3MigrationAmounts({
        hasEnoughNeoBalance: false,
        hasEnoughGasBalance: false,
        gasBalance: gasBalance,
      })
    ).toEqual({
      gasMigrationReceiveAmount: undefined,
      gasMigrationTotalFees: undefined,
      neoMigrationReceiveAmount: undefined,
      neoMigrationTotalFees: undefined,
    })

    expect(
      neo3NeoLegacyMigrationService.calculateNeo3MigrationAmounts({
        hasEnoughNeoBalance: false,
        hasEnoughGasBalance: false,
        neoBalance: neoBalance,
        gasBalance: gasBalance,
      })
    ).toEqual({
      gasMigrationReceiveAmount: undefined,
      gasMigrationTotalFees: undefined,
      neoMigrationReceiveAmount: undefined,
      neoMigrationTotalFees: undefined,
    })

    expect(
      neo3NeoLegacyMigrationService.calculateNeo3MigrationAmounts({
        hasEnoughNeoBalance: true,
        hasEnoughGasBalance: true,
      })
    ).toEqual({
      gasMigrationReceiveAmount: undefined,
      gasMigrationTotalFees: undefined,
      neoMigrationReceiveAmount: undefined,
      neoMigrationTotalFees: undefined,
    })
  })

  it('Should be able to calculate neo3 values', async () => {
    const neoBalance = { amount: '4', token: BSNeoLegacyConstants.NEO_ASSET }
    const gasBalance = { amount: '1', token: BSNeoLegacyConstants.GAS_ASSET }

    const expectNeoTotalFees = '1'
    const expectNeoReceiveAmount = '3'
    const expectGasTotalFees = '0.03209217'
    const expectGasReceiveAmount = '0.96790782'

    expect(
      neo3NeoLegacyMigrationService.calculateNeo3MigrationAmounts({
        hasEnoughNeoBalance: true,
        hasEnoughGasBalance: false,
        neoBalance,
      })
    ).toEqual({
      gasMigrationReceiveAmount: undefined,
      gasMigrationTotalFees: undefined,
      neoMigrationReceiveAmount: expectNeoReceiveAmount,
      neoMigrationTotalFees: expectNeoTotalFees,
    })

    expect(
      neo3NeoLegacyMigrationService.calculateNeo3MigrationAmounts({
        hasEnoughNeoBalance: false,
        hasEnoughGasBalance: true,
        gasBalance,
      })
    ).toEqual({
      gasMigrationReceiveAmount: expectGasReceiveAmount,
      gasMigrationTotalFees: expectGasTotalFees,
      neoMigrationReceiveAmount: undefined,
      neoMigrationTotalFees: undefined,
    })

    expect(
      neo3NeoLegacyMigrationService.calculateNeo3MigrationAmounts({
        hasEnoughNeoBalance: true,
        hasEnoughGasBalance: true,
        neoBalance,
        gasBalance,
      })
    ).toEqual({
      gasMigrationReceiveAmount: expectGasReceiveAmount,
      gasMigrationTotalFees: expectGasTotalFees,
      neoMigrationReceiveAmount: expectNeoReceiveAmount,
      neoMigrationTotalFees: expectNeoTotalFees,
    })
  })

  it("Shouldn't be able to migrate if network is a non Mainnet network", async () => {
    service = new BSNeoLegacy('test', BSNeoLegacyConstants.TESTNET_NETWORK)
    neo3NeoLegacyMigrationService = new Neo3NeoLegacyMigrationService(service)
    const neoLegacyMigrationAmounts: TNeo3NeoLegacyMigrationNeoLegacyAmounts = {
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: undefined,
      neoBalance: undefined,
    }
    await expect(
      neo3NeoLegacyMigrationService.migrate({ account, neo3Address, neoLegacyMigrationAmounts })
    ).rejects.toThrow('Must use Mainnet network')
  })

  it("Shouldn't be able to migrate if address does not the have minimum balance", async () => {
    await expect(
      neo3NeoLegacyMigrationService.migrate({
        account,
        neo3Address,
        neoLegacyMigrationAmounts: {
          hasEnoughGasBalance: false,
          hasEnoughNeoBalance: false,
        },
      })
    ).rejects.toThrow('Must have at least 0.1 GAS or 2 NEO')
  })

  it.skip('Should be able to migrate', async () => {
    const balance = await service.blockchainDataService.getBalance(account.address)
    const neoLegacyMigrationAmounts = neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts(balance)
    const transactionHash = await neo3NeoLegacyMigrationService.migrate({
      account,
      neo3Address,
      neoLegacyMigrationAmounts,
    })
    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to migrate using a Ledger', async () => {
    const transport = await TransportNodeHid.create()

    service = new BSNeoLegacy('test', BSNeoLegacyConstants.MAINNET_NETWORK, async () => transport)
    neo3NeoLegacyMigrationService = new Neo3NeoLegacyMigrationService(service)

    const hardwareAccount = await service.ledgerService.getAccount(transport, 0)

    const balance = await service.blockchainDataService.getBalance(account.address)
    const neoLegacyMigrationAmounts = neo3NeoLegacyMigrationService.calculateNeoLegacyMigrationAmounts(balance)

    const transactionHash = await neo3NeoLegacyMigrationService.migrate({
      account: hardwareAccount,
      neo3Address,
      neoLegacyMigrationAmounts,
    })
    expect(transactionHash).toEqual(expect.any(String))

    transport.close()
  })
})
