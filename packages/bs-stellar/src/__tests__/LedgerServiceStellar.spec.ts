import Transport from '@ledgerhq/hw-transport'

import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { LedgerServiceStellar } from '../services/ledger/LedgerServiceStellar'
import { BSStellar } from '../BSStellar'
import { BSStellarConstants } from '../constants/BSStellarConstants'
import { BSKeychainHelper } from '@cityofzion/blockchain-service'
import * as stellarSDK from '@stellar/stellar-sdk'

let ledgerService: LedgerServiceStellar<'test'>
let transport: Transport
let bsStellar: BSStellar<'test'>
const network = BSStellarConstants.TESTNET_NETWORK

describe.skip('LedgerServiceStellar', () => {
  beforeAll(async () => {
    bsStellar = new BSStellar('test', network)

    transport = await TransportNodeHid.create()
    ledgerService = new LedgerServiceStellar(bsStellar, async () => transport)
  })

  it('Should be able to get all accounts', async () => {
    const accounts = await ledgerService.getAccounts(transport)
    expect(accounts.length).toBeGreaterThan(1)

    accounts.forEach((account, index) => {
      expect(account).toEqual(
        expect.objectContaining({
          address: expect.any(String),
          key: expect.any(String),
          type: 'publicKey',
          bipPath: BSKeychainHelper.getBipPath(bsStellar.bipDerivationPath, index),
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
        bipPath: BSKeychainHelper.getBipPath(bsStellar.bipDerivationPath, 0),
      })
    )
  })

  it('Should be able to sign transaction', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    const sorobanServer = new stellarSDK.rpc.Server(bsStellar.network.url)

    const sourceAccount = await sorobanServer.getAccount(account.address)
    const transaction = new stellarSDK.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: BSStellarConstants.NETWORK_PASSPHRASE_BY_NETWORK_ID[bsStellar.network.id],
    })

    transaction.addOperation(
      stellarSDK.Operation.payment({
        destination: account.address,
        asset: stellarSDK.Asset.native(),
        amount: '1',
      })
    )

    const builtTransaction = transaction.setTimeout(30).build()
    const signedTransaction = await ledgerService.signTransaction(transport, builtTransaction, account)

    expect(signedTransaction).toBeDefined()
    expect(signedTransaction.signatures.length).toBeGreaterThan(0)
  })
})
