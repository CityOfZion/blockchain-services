import type { TBSAccount } from '@cityofzion/blockchain-service'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { WalletConnectServiceSolana } from '../services/wallet-connect/WalletConnectServiceSolana'
import bs58 from 'bs58'
import * as solanaSDK from '@solana/web3.js'

let service: BSSolana<'test'>
let walletConnectServiceSolana: WalletConnectServiceSolana<'test'>
let account: TBSAccount<'test'>

const mnemonic = process.env.TEST_MNEMONIC as string

describe('WalletConnectServiceSolana', () => {
  beforeEach(async () => {
    service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK)
    walletConnectServiceSolana = new WalletConnectServiceSolana(service)

    account = service.generateAccountFromMnemonic(mnemonic, 0)
  })

  it("Should be able to get accounts with 'solana_getAccounts'", async () => {
    const accounts = await walletConnectServiceSolana.solana_getAccounts({ account, params: [] })
    expect(accounts).toEqual([{ pubkey: account.address }])
  })

  it("Should be able to request accounts with 'solana_requestAccounts'", async () => {
    const accounts = await walletConnectServiceSolana.solana_requestAccounts({ account, params: [] })
    expect(accounts).toEqual([{ pubkey: account.address }])
  })

  it("Should be able to sign message with 'solana_signMessage'", async () => {
    const message = bs58.encode(Buffer.from('Hello, Solana!'))
    const { signature } = await walletConnectServiceSolana.solana_signMessage({
      account,
      params: { message, pubKey: account.address },
    })

    expect(signature).toEqual(
      '4bKrCM8vfUTQkidgZfKmqsrTaAKUAeM8KAMCehaSt7ju8uY5U6Tf62Bt5w6FoLaVT9bgTKgACVrEtT47csyLLF9Y'
    )
  })

  it("Should throw error if message is not a string in 'solana_signMessage'", async () => {
    await expect(
      walletConnectServiceSolana.solana_signMessage({
        account,
        params: { message: 123 as any, pubKey: account.address },
      })
    ).rejects.toThrow('Invalid params')
  })

  it("Should throw error if pubKey does not match account address in 'solana_signMessage'", async () => {
    const message = bs58.encode(Buffer.from('Hello, Solana!'))
    await expect(
      walletConnectServiceSolana.solana_signMessage({
        account,
        params: { message, pubKey: 'invalidPubKey' },
      })
    ).rejects.toThrow('Public key does not match account address')
  })

  it("Should be able to sign transaction with 'solana_signTransaction'", async () => {
    const wallet = new solanaSDK.PublicKey(account.address)

    const latestBlockhash = await service.connection.getLatestBlockhash()

    const transaction = new solanaSDK.Transaction()
    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.feePayer = wallet

    transaction.add(
      solanaSDK.SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: wallet,
        lamports: 1,
      })
    )

    const clonedTransaction = solanaSDK.Transaction.from(transaction.serialize({ verifySignatures: false }))

    const serializedTransaction = Buffer.from(
      new Uint8Array(transaction.serialize({ verifySignatures: false }))
    ).toString('base64')

    const result = await walletConnectServiceSolana.solana_signTransaction({
      account,
      params: { transaction: serializedTransaction },
    })

    clonedTransaction.sign(service.generateKeyPairFromKey(account.key))

    expect(result.transaction).toEqual(clonedTransaction.serialize().toString('base64'))
  })

  it("Should be able to sign all transaction with 'solana_signAllTransaction'", async () => {
    const wallet = new solanaSDK.PublicKey(account.address)

    const latestBlockhash = await service.connection.getLatestBlockhash()

    const transaction = new solanaSDK.Transaction()
    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.feePayer = wallet

    transaction.add(
      solanaSDK.SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: wallet,
        lamports: 1,
      })
    )

    const clonedTransaction = solanaSDK.Transaction.from(transaction.serialize({ verifySignatures: false }))

    const serializedTransaction = Buffer.from(
      new Uint8Array(transaction.serialize({ verifySignatures: false }))
    ).toString('base64')

    const result = await walletConnectServiceSolana.solana_signAllTransactions({
      account,
      params: { transactions: [serializedTransaction] },
    })

    clonedTransaction.sign(service.generateKeyPairFromKey(account.key))

    expect(result.transactions[0]).toEqual(clonedTransaction.serialize().toString('base64'))
  })

  it('Should be able to calculate fees', async () => {
    const wallet = new solanaSDK.PublicKey(account.address)

    const latestBlockhash = await service.connection.getLatestBlockhash()

    const transaction = new solanaSDK.Transaction()
    transaction.recentBlockhash = latestBlockhash.blockhash
    transaction.feePayer = wallet

    transaction.add(
      solanaSDK.SystemProgram.transfer({
        fromPubkey: wallet,
        toPubkey: wallet,
        lamports: 1,
      })
    )

    const clonedTransaction = solanaSDK.Transaction.from(transaction.serialize({ verifySignatures: false }))

    const serializedTransaction = Buffer.from(
      new Uint8Array(transaction.serialize({ verifySignatures: false }))
    ).toString('base64')

    const result = await walletConnectServiceSolana.calculateRequestFee({
      account,
      params: { transaction: serializedTransaction },
    })

    clonedTransaction.sign(service.generateKeyPairFromKey(account.key))

    expect(Number(result)).toBeGreaterThan(0)
  })
})
