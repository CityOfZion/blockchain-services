import Transport from '@ledgerhq/hw-transport'

import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { Web3LedgerServiceSolana } from '../services/ledger/Web3LedgerServiceSolana'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { BSKeychainHelper } from '@cityofzion/blockchain-service'
import * as solanaKit from '@solana/kit'
import * as solanaSystem from '@solana-program/system'

let ledgerService: Web3LedgerServiceSolana<'test'>
let transport: Transport
let bsSolana: BSSolana<'test'>
const network = BSSolanaConstants.TESTNET_NETWORK

describe.skip('NeonDappKitLedgerServiceNeo3', () => {
  beforeAll(async () => {
    bsSolana = new BSSolana('test', network)

    transport = await TransportNodeHid.create()
    ledgerService = new Web3LedgerServiceSolana(bsSolana, async () => transport)
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
          bip44Path: BSKeychainHelper.getBip44Path(BSKeychainHelper.fixBip44Path(bsSolana.bip44DerivationPath), index),
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
        bip44Path: BSKeychainHelper.getBip44Path(BSKeychainHelper.fixBip44Path(bsSolana.bip44DerivationPath), 0),
      })
    )
  })

  it('Should be able to sign transaction', async () => {
    const account = await ledgerService.getAccount(transport, 0)
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))

    const { value: latestBlockhash } = await bsSolana.solanaKitRpc.getLatestBlockhash().send()

    const transactionMessage = solanaKit.pipe(
      solanaKit.createTransactionMessage({ version: 0 }),
      tx => solanaKit.setTransactionMessageFeePayer(source.address, tx),
      tx => solanaKit.setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      tx =>
        solanaKit.appendTransactionMessageInstruction(
          solanaSystem.getTransferSolInstruction({
            source,
            destination: source.address,
            amount: 1n,
          }),
          tx
        )
    )

    const compiledTransaction = solanaKit.compileTransaction(transactionMessage)

    const serializedTransaction = await ledgerService.signTransaction(transport, compiledTransaction, account)

    const transactionBytes = solanaKit.getBase64Encoder().encode(serializedTransaction)
    const transaction = solanaKit.getTransactionCodec().decode(transactionBytes)

    expect(serializedTransaction).toBeDefined()
    expect(transaction.signatures[source.address]).toBeDefined()
  })
})
