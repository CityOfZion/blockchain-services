import { BSError, type TBSAccount } from '@cityofzion/blockchain-service'
import { BSSolana } from '../BSSolana'
import { BSSolanaConstants } from '../constants/BSSolanaConstants'
import { WalletConnectServiceSolana } from '../services/wallet-connect/WalletConnectServiceSolana'
import * as solanaKit from '@solana/kit'
import * as solanaSystem from '@solana-program/system'
import type { TBSSolanaName } from '../types'

let service: BSSolana
let walletConnectServiceSolana: WalletConnectServiceSolana
let account: TBSAccount<TBSSolanaName>

const mnemonic = process.env.TEST_MNEMONIC

describe('WalletConnectServiceSolana', () => {
  beforeEach(async () => {
    service = new BSSolana(BSSolanaConstants.TESTNET_NETWORK)
    walletConnectServiceSolana = new WalletConnectServiceSolana(service)

    account = await service.generateAccountFromMnemonic(mnemonic, 0)
  })

  it('Should have correct namespace and chain', () => {
    expect(walletConnectServiceSolana.namespace).toBe('solana')
    expect(walletConnectServiceSolana.chain).toBe('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1')
  })

  it('Should have supported methods', () => {
    expect(walletConnectServiceSolana.supportedMethods).toContain('solana_getAccounts')
    expect(walletConnectServiceSolana.supportedMethods).toContain('solana_requestAccounts')
    expect(walletConnectServiceSolana.supportedMethods).toContain('solana_signMessage')
    expect(walletConnectServiceSolana.supportedMethods).toContain('solana_signTransaction')
    expect(walletConnectServiceSolana.supportedMethods).toContain('solana_signAllTransactions')
    expect(walletConnectServiceSolana.supportedMethods).toContain('solana_signAndSendTransaction')
  })

  it('Should have calculable methods', () => {
    expect(walletConnectServiceSolana.calculableMethods).toContain('solana_signAndSendTransaction')
    expect(walletConnectServiceSolana.calculableMethods).toHaveLength(1)
  })

  it('Should have auto approve methods', () => {
    expect(walletConnectServiceSolana.autoApproveMethods).toContain('solana_getAccounts')
    expect(walletConnectServiceSolana.autoApproveMethods).toContain('solana_requestAccounts')
    expect(walletConnectServiceSolana.autoApproveMethods).toHaveLength(2)
  })

  it('Should have empty supported events', () => {
    expect(walletConnectServiceSolana.supportedEvents).toEqual([])
  })

  it('Should be able to validate solana_getAccounts params', async () => {
    await expect(walletConnectServiceSolana.handlers.solana_getAccounts.validate(undefined)).resolves.not.toThrow()
  })

  it("Should be able to get accounts with 'solana_getAccounts'", async () => {
    const accounts = await walletConnectServiceSolana.handlers.solana_getAccounts.process({
      account,
      params: [],
      method: 'solana_getAccounts',
    })
    expect(accounts).toEqual([{ pubkey: account.address }])
  })

  it('Should be able to validate solana_requestAccounts params', async () => {
    await expect(walletConnectServiceSolana.handlers.solana_requestAccounts.validate(undefined)).resolves.not.toThrow()
  })

  it("Should be able to request accounts with 'solana_requestAccounts'", async () => {
    const accounts = await walletConnectServiceSolana.handlers.solana_requestAccounts.process({
      account,
      params: [],
      method: 'solana_requestAccounts',
    })
    expect(accounts).toEqual([{ pubkey: account.address }])
  })

  it("Shouldn't be able to validate solana_signMessage with invalid params", async () => {
    await expect(walletConnectServiceSolana.handlers.solana_signMessage.validate({})).rejects.toThrow()
    await expect(walletConnectServiceSolana.handlers.solana_signMessage.validate('invalid')).rejects.toThrow()
    await expect(
      walletConnectServiceSolana.handlers.solana_signMessage.validate({ message: 123, pubkey: 'key' })
    ).rejects.toThrow()
  })

  it('Should be able to validate solana_signMessage params', async () => {
    const validParams = { message: 'base58-encoded-message', pubkey: account.address }
    const result = await walletConnectServiceSolana.handlers.solana_signMessage.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it("Should throw error if pubkey does not match account address in 'solana_signMessage'", async () => {
    const message = solanaKit.getBase58Codec().decode(Buffer.from('Hello, Solana!'))
    await expect(
      walletConnectServiceSolana.handlers.solana_signMessage.process({
        account,
        params: { message, pubkey: 'invalidPubKey' },
        method: 'solana_signMessage',
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('PUBKEY_MISMATCH')

      return true
    })
  })

  it("Should be able to sign message with 'solana_signMessage'", async () => {
    const message = solanaKit
      .getBase58Codec()
      .decode(Buffer.from('Hello, EAha4PVR4iHzxYiXpb9sG4q1DZjkwbMq9Np1J6C1gYYG'))

    const { signature } = await walletConnectServiceSolana.handlers.solana_signMessage.process({
      account,
      params: { message, pubkey: account.address },
      method: 'solana_signMessage',
    })

    expect(signature).toEqual(expect.any(String))
  })

  it("Should be able to sign message with 'solana_signMessage' using mnemonic account", async () => {
    const accountFromMnemonic = await service.generateAccountFromMnemonic(mnemonic, 1)
    const message = solanaKit.getBase58Codec().decode(Buffer.from('Test message'))

    const { signature } = await walletConnectServiceSolana.handlers.solana_signMessage.process({
      account: accountFromMnemonic,
      params: { message, pubkey: accountFromMnemonic.address },
      method: 'solana_signMessage',
    })

    expect(signature).toEqual(expect.any(String))
  })

  it("Shouldn't be able to validate solana_signTransaction with invalid params", async () => {
    await expect(walletConnectServiceSolana.handlers.solana_signTransaction.validate({})).rejects.toThrow()
    await expect(walletConnectServiceSolana.handlers.solana_signTransaction.validate('invalid')).rejects.toThrow()
    await expect(
      walletConnectServiceSolana.handlers.solana_signTransaction.validate({ transaction: 123 })
    ).rejects.toThrow()
  })

  it('Should be able to validate solana_signTransaction params', async () => {
    const validParams = { transaction: 'base64-encoded-transaction' }
    const result = await walletConnectServiceSolana.handlers.solana_signTransaction.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it("Should be able to sign transaction with 'solana_signTransaction'", async () => {
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))

    const { value: latestBlockhash } = await service._solanaKitRpc.getLatestBlockhash().send()

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

    const result = await walletConnectServiceSolana.handlers.solana_signTransaction.process({
      account,
      params: { transaction: encodedTransaction },
      method: 'solana_signTransaction',
    })

    const keyPair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(account.key))
    const signedCloneTransaction = await solanaKit.partiallySignTransaction([keyPair], compiledTransaction)

    expect(result.transaction).toEqual(solanaKit.getBase64EncodedWireTransaction(signedCloneTransaction))
  })

  it("Shouldn't be able to validate solana_signAllTransactions with invalid params", async () => {
    await expect(walletConnectServiceSolana.handlers.solana_signAllTransactions.validate({})).rejects.toThrow()
    await expect(
      walletConnectServiceSolana.handlers.solana_signAllTransactions.validate({ transactions: 'invalid' })
    ).rejects.toThrow()
    await expect(
      walletConnectServiceSolana.handlers.solana_signAllTransactions.validate({ transactions: [123] })
    ).rejects.toThrow()
  })

  it('Should be able to validate solana_signAllTransactions params', async () => {
    const validParams = { transactions: ['tx1', 'tx2'] }
    const result = await walletConnectServiceSolana.handlers.solana_signAllTransactions.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it("Should be able to sign all transaction with 'solana_signAllTransaction'", async () => {
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))

    const { value: latestBlockhash } = await service._solanaKitRpc.getLatestBlockhash().send()

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

    const result = await walletConnectServiceSolana.handlers.solana_signAllTransactions.process({
      account,
      params: { transactions: [encodedTransaction] },
      method: 'solana_signAllTransactions',
    })

    const keyPair = await solanaKit.createKeyPairFromBytes(solanaKit.getBase58Encoder().encode(account.key))
    const signedCloneTransaction = await solanaKit.partiallySignTransaction([keyPair], compiledTransaction)

    expect(result.transactions[0]).toEqual(solanaKit.getBase64EncodedWireTransaction(signedCloneTransaction))
  })

  it("Should be able to sign multiple transactions with 'solana_signAllTransactions'", async () => {
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))
    const { value: latestBlockhash } = await service._solanaKitRpc.getLatestBlockhash().send()

    const createTransaction = (amount: bigint) => {
      const transactionMessage = solanaKit.pipe(
        solanaKit.createTransactionMessage({ version: 0 }),
        tx => solanaKit.setTransactionMessageFeePayer(source.address, tx),
        tx => solanaKit.setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        tx =>
          solanaKit.appendTransactionMessageInstruction(
            solanaSystem.getTransferSolInstruction({
              source,
              destination: source.address,
              amount,
            }),
            tx
          )
      )
      return solanaKit.getBase64EncodedWireTransaction(solanaKit.compileTransaction(transactionMessage))
    }

    const encodedTx1 = createTransaction(1n)
    const encodedTx2 = createTransaction(2n)

    const result = await walletConnectServiceSolana.handlers.solana_signAllTransactions.process({
      account,
      params: { transactions: [encodedTx1, encodedTx2] },
      method: 'solana_signAllTransactions',
    })

    expect(result.transactions).toHaveLength(2)
    expect(result.transactions[0]).toEqual(expect.any(String))
    expect(result.transactions[1]).toEqual(expect.any(String))
  })

  it("Shouldn't be able to validate solana_signAndSendTransaction with invalid params", async () => {
    const handler = walletConnectServiceSolana.handlers.solana_signAndSendTransaction
    await expect(handler.validate({})).rejects.toThrow()
    await expect(handler.validate('invalid')).rejects.toThrow()
    await expect(handler.validate({ transaction: 123 })).rejects.toThrow()
  })

  it('Should be able to validate solana_signAndSendTransaction params', async () => {
    const validParams = { transaction: 'base64-encoded-transaction' }
    const result = await walletConnectServiceSolana.handlers.solana_signAndSendTransaction.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it('Should be able to validate solana_signAndSendTransaction params with sendOptions', async () => {
    const validParams = {
      transaction: 'base64-encoded-transaction',
      sendOptions: {
        skipPreflight: true,
        preflightCommitment: 'confirmed' as const,
      },
    }
    const result = await walletConnectServiceSolana.handlers.solana_signAndSendTransaction.validate(validParams)
    expect(result).toEqual(validParams)
  })

  it("Shouldn't be able to calculate request fee with invalid params", async () => {
    await expect(
      walletConnectServiceSolana.calculateRequestFee({
        account,
        method: 'solana_signAndSendTransaction',
        params: 'invalid',
      })
    ).rejects.toSatisfy((error: Error) => {
      expect(error).toBeInstanceOf(BSError)
      expect((error as BSError).code).toBe('INVALID_PARAMS')

      return true
    })
  })

  it('Should be able to calculate fees', async () => {
    const source = solanaKit.createNoopSigner(solanaKit.address(account.address))

    const { value: latestBlockhash } = await service._solanaKitRpc.getLatestBlockhash().send()

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
      method: 'solana_signAndSendTransaction',
    })

    expect(fee).toMatch(/^0\.0\d*[1-9]$/)
  })
})
