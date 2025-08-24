import Transport from '@ledgerhq/hw-transport'

import TransportNodeHid from '@ledgerhq/hw-transport-node-hid'
import { Web3LedgerServiceSolana } from '../services/ledger/Web3LedgerServiceSolana'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import solanaSDK from '@solana/web3.js'
import { BSSolanaHelper } from '../helpers/BSSolanaHelper'

let ledgerService: Web3LedgerServiceSolana<'solana'>
let transport: Transport
let bsSolana: BSSolana<'solana'>
const network = BSSolanaConstants.TESTNET_NETWORKS[0]

const keys = {
  moralisApiKey: process.env.MORALIS_API_KEY!,
  tatumMainnetApiKey: process.env.TATUM_MAINNET_API_KEY!,
  tatumTestnetApiKey: process.env.TATUM_TESTNET_API_KEY!,
}

describe.skip('NeonDappKitLedgerServiceNeo3', () => {
  beforeAll(async () => {
    bsSolana = new BSSolana('solana', keys, network)

    transport = await TransportNodeHid.create()
    ledgerService = new Web3LedgerServiceSolana(bsSolana, async () => transport)
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
          bip44Path: BSSolanaHelper.getBip44Path(bsSolana.bip44DerivationPath, index),
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
        bip44Path: BSSolanaHelper.getBip44Path(bsSolana.bip44DerivationPath, 0),
      })
    )
  }, 60000)

  it('Should be able to sign transaction', async () => {
    const account = await ledgerService.getAccount(transport, 0)

    const senderPublicKey = new solanaSDK.PublicKey(account.address)
    const connection = new solanaSDK.Connection(network.url)
    const latestBlockhash = await connection.getLatestBlockhash()

    const transaction = new solanaSDK.Transaction()
    transaction.feePayer = senderPublicKey
    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight
    transaction.add(
      solanaSDK.SystemProgram.transfer({
        fromPubkey: senderPublicKey,
        toPubkey: senderPublicKey,
        lamports: 1,
      })
    )

    const serializedTransaction = await ledgerService.signTransaction(transport, transaction, account)

    expect(serializedTransaction).toBeDefined()
    expect(serializedTransaction).toBeInstanceOf(Buffer)
  }, 60000)
})
