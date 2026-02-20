import type { TBSAccount } from '@cityofzion/blockchain-service'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { WalletConnectServiceSolana } from '../services/wallet-connect/WalletConnectServiceSolana'
import * as solanaKit from '@solana/kit'
import * as solanaSystem from '@solana-program/system'

let service: BSSolana<'test'>
let walletConnectServiceSolana: WalletConnectServiceSolana<'test'>
let account: TBSAccount<'test'>

const mnemonic = process.env.TEST_MNEMONIC as string

describe('WalletConnectServiceSolana', () => {
  beforeEach(async () => {
    service = new BSSolana('test', BSSolanaConstants.TESTNET_NETWORK)
    walletConnectServiceSolana = new WalletConnectServiceSolana(service)

    account = await service.generateAccountFromMnemonic(mnemonic, 0)
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
    const message = solanaKit
      .getBase58Codec()
      .decode(Buffer.from('Hello, EAha4PVR4iHzxYiXpb9sG4q1DZjkwbMq9Np1J6C1gYYG'))

    const { signature } = await walletConnectServiceSolana.solana_signMessage({
      account,
      params: { message, pubkey: account.address },
    })

    expect(signature).toEqual(expect.any(String))
  })

  it("Should throw error if message is not a string in 'solana_signMessage'", async () => {
    await expect(
      walletConnectServiceSolana.solana_signMessage({
        account,
        params: { message: 123 as any, pubkey: account.address },
      })
    ).rejects.toThrow('Invalid params')
  })

  it("Should throw error if pubkey does not match account address in 'solana_signMessage'", async () => {
    const message = solanaKit.getBase58Codec().decode(Buffer.from('Hello, Solana!'))
    await expect(
      walletConnectServiceSolana.solana_signMessage({
        account,
        params: { message, pubkey: 'invalidPubKey' },
      })
    ).rejects.toThrow('Public key does not match account address')
  })

  it("Should be able to sign transaction with 'solana_signTransaction'", async () => {
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))

    const { value: latestBlockhash } = await service.solanaKitRpc.getLatestBlockhash().send()

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

    const encodedTransaction = solanaKit.getBase64EncodedWireTransaction(compiledTransaction)

    const result = await walletConnectServiceSolana.solana_signTransaction({
      account,
      params: { transaction: encodedTransaction },
    })

    const keyPair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(account.key))

    const signedCloneTransaction = await solanaKit.partiallySignTransaction([keyPair], compiledTransaction)

    expect(result.transaction).toEqual(solanaKit.getBase64EncodedWireTransaction(signedCloneTransaction))
  })

  it("Should be able to sign all transaction with 'solana_signAllTransaction'", async () => {
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))

    const { value: latestBlockhash } = await service.solanaKitRpc.getLatestBlockhash().send()

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

    const encodedTransaction = solanaKit.getBase64EncodedWireTransaction(compiledTransaction)

    const result = await walletConnectServiceSolana.solana_signAllTransactions({
      account,
      params: { transactions: [encodedTransaction] },
    })

    const keyPair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(account.key))

    const signedCloneTransaction = await solanaKit.partiallySignTransaction([keyPair], compiledTransaction)

    expect(result.transactions[0]).toEqual(solanaKit.getBase64EncodedWireTransaction(signedCloneTransaction))
  })

  it('Should be able to calculate fees', async () => {
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))

    const { value: latestBlockhash } = await service.solanaKitRpc.getLatestBlockhash().send()

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

    const encodedTransaction = solanaKit.getBase64EncodedWireTransaction(compiledTransaction)

    const fee = await walletConnectServiceSolana.calculateRequestFee({
      account,
      params: { transaction: encodedTransaction },
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })
})
