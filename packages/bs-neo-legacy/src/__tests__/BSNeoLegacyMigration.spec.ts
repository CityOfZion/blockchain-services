import { BSNeoLegacyConstants } from '../constants/BSNeoLegacyConstants'
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { Account, BalanceResponse } from '@cityofzion/blockchain-service'
import { BSNeoLegacy, CalculateNeoLegacyMigrationAmountsResponse } from '../BSNeoLegacy'

const testnetNetwork = BSNeoLegacyConstants.TESTNET_NETWORKS[0]

const neo3Address = 'NWs1nPJP8XkZxsNwuGYmikzQrEJcZBAUJN'
let serviceNeoLegacy: BSNeoLegacy<'neoLegacy'>
let account: Account<'neoLegacy'>

describe('BSNeoLegacy - Migration', () => {
  beforeEach(async () => {
    serviceNeoLegacy = new BSNeoLegacy('neoLegacy', BSNeoLegacyConstants.DEFAULT_NETWORK)
    account = serviceNeoLegacy.generateAccountFromKey(process.env.NEO_LEGACY_WITH_BALANCE_PRIVATE_KEY)
  })

  it('Should be able to calculate neo legacy migration values for empty balance', async () => {
    expect(serviceNeoLegacy.calculateNeoLegacyMigrationAmounts([])).toEqual({
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: undefined,
      neoBalance: undefined,
    })

    const balances: BalanceResponse[] = [
      { amount: '0', token: BSNeoLegacyConstants.NEO_ASSET },
      { amount: '0', token: BSNeoLegacyConstants.GAS_ASSET },
    ]

    expect(serviceNeoLegacy.calculateNeoLegacyMigrationAmounts(balances)).toEqual({
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: balances[1],
      neoBalance: balances[0],
    })
  })

  it('Should be able to calculate neo legacy migration values for no minimum balances', async () => {
    const balances: BalanceResponse[] = [
      { amount: '1', token: BSNeoLegacyConstants.NEO_ASSET },
      { amount: '0.0001', token: BSNeoLegacyConstants.GAS_ASSET },
    ]
    expect(serviceNeoLegacy.calculateNeoLegacyMigrationAmounts(balances)).toEqual({
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: balances[1],
      neoBalance: balances[0],
    })
  })

  it('Should be able to calculate neo legacy migration values', async () => {
    const gasBalance: BalanceResponse = { amount: '1', token: BSNeoLegacyConstants.GAS_ASSET }
    expect(serviceNeoLegacy.calculateNeoLegacyMigrationAmounts([gasBalance])).toEqual({
      hasEnoughNeoBalance: false,
      hasEnoughGasBalance: true,
      neoBalance: undefined,
      gasBalance,
    })

    const neoBalance = { amount: '4', token: BSNeoLegacyConstants.NEO_ASSET }
    expect(serviceNeoLegacy.calculateNeoLegacyMigrationAmounts([neoBalance])).toEqual({
      hasEnoughNeoBalance: true,
      hasEnoughGasBalance: false,
      neoBalance,
      gasBalance: undefined,
    })

    expect(serviceNeoLegacy.calculateNeoLegacyMigrationAmounts([gasBalance, neoBalance])).toEqual({
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
      serviceNeoLegacy.calculateNeo3MigrationAmounts({
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
      serviceNeoLegacy.calculateNeo3MigrationAmounts({
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
      serviceNeoLegacy.calculateNeo3MigrationAmounts({
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
      serviceNeoLegacy.calculateNeo3MigrationAmounts({
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
      serviceNeoLegacy.calculateNeo3MigrationAmounts({
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
      serviceNeoLegacy.calculateNeo3MigrationAmounts({
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
      serviceNeoLegacy.calculateNeo3MigrationAmounts({
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
    serviceNeoLegacy = new BSNeoLegacy('neoLegacy', testnetNetwork)
    const neoLegacyMigrationAmounts: CalculateNeoLegacyMigrationAmountsResponse = {
      hasEnoughGasBalance: false,
      hasEnoughNeoBalance: false,
      gasBalance: undefined,
      neoBalance: undefined,
    }
    await expect(serviceNeoLegacy.migrate({ account, neo3Address, neoLegacyMigrationAmounts })).rejects.toThrow(
      'Must use Mainnet network'
    )
  })

  it("Shouldn't be able to migrate if address does not the have minimum balance", async () => {
    await expect(
      serviceNeoLegacy.migrate({
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
    const balance = await serviceNeoLegacy.blockchainDataService.getBalance(account.address)
    const neoLegacyMigrationAmounts = serviceNeoLegacy.calculateNeoLegacyMigrationAmounts(balance)
    const transactionHash = await serviceNeoLegacy.migrate({ account, neo3Address, neoLegacyMigrationAmounts })
    expect(transactionHash).toEqual(expect.any(String))
  })

  it.skip('Should be able to migrate using a Ledger', async () => {
    const transport = await TransportNodeHid.create()

    serviceNeoLegacy = new BSNeoLegacy('neoLegacy', BSNeoLegacyConstants.DEFAULT_NETWORK, async () => transport)

    const hardwareAccount = await serviceNeoLegacy.ledgerService.getAccount(transport, 0)

    const balance = await serviceNeoLegacy.blockchainDataService.getBalance(account.address)
    const neoLegacyMigrationAmounts = serviceNeoLegacy.calculateNeoLegacyMigrationAmounts(balance)

    const transactionHash = await serviceNeoLegacy.migrate({
      account: hardwareAccount,
      neo3Address,
      neoLegacyMigrationAmounts,
    })
    expect(transactionHash).toEqual(expect.any(String))

    transport.close()
  }, 60_000)
})
