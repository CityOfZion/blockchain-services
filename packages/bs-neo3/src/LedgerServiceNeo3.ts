import { Account, BlockchainDataService, LedgerService, LedgerServiceEmitter } from '@cityofzion/blockchain-service'
import Transport from '@ledgerhq/hw-transport'
import { wallet, api, u } from '@cityofzion/neon-js'
import { NeonParser } from '@cityofzion/neon-dappkit'
import EventEmitter from 'events'

export class LedgerServiceNeo3 implements LedgerService {
  #blockchainDataService: BlockchainDataService
  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter
  getLedgerTransport?: (account: Account) => Promise<Transport>

  constructor(
    blockchainDataService: BlockchainDataService,
    getLedgerTransport?: (account: Account) => Promise<Transport>
  ) {
    this.#blockchainDataService = blockchainDataService
    this.getLedgerTransport = getLedgerTransport
  }

  getSigningCallback(transport: Transport, account: Account): api.SigningFunction {
    return async (transaction, { witnessIndex, network }) => {
      const neonJsAccount = new wallet.Account(account.key)

      const witnessScriptHash = wallet.getScriptHashFromVerificationScript(
        transaction.witnesses[witnessIndex].verificationScript.toString()
      )

      if (neonJsAccount.scriptHash !== witnessScriptHash) {
        throw new Error('Invalid witness script hash')
      }

      const signature = await this.getSignature(transport, transaction.serialize(false), network, witnessIndex)

      return signature
    }
  }

  async getSignature(transport: Transport, serializedTransaction: string, networkMagic: number, addressIndex = 0) {
    try {
      this.emitter.emit('getSignatureStart')

      const bip44Buffer = this.#toBip44Buffer(addressIndex)
      await transport.send(0x80, 0x02, 0, 0x80, bip44Buffer, [0x9000])
      await transport.send(0x80, 0x02, 1, 0x80, Buffer.from(NeonParser.numToHex(networkMagic, 4, true), 'hex'), [
        0x9000,
      ])

      const chunks = serializedTransaction.match(/.{1,510}/g) || []

      for (let i = 0; i < chunks.length - 1; i++) {
        await transport.send(0x80, 0x02, 2 + i, 0x80, Buffer.from(chunks[i], 'hex'), [0x9000])
      }

      const response = await transport.send(
        0x80,
        0x02,
        2 + chunks.length,
        0x00,
        Buffer.from(chunks[chunks.length - 1], 'hex'),
        [0x9000]
      )

      if (response.length <= 2) {
        throw new Error(`No more data but Ledger did not return signature!`)
      }

      const signature = this.#derSignatureToHex(response.toString('hex'))

      return signature
    } finally {
      this.emitter.emit('getSignatureEnd')
    }
  }

  async getAccounts(transport: Transport): Promise<Account[]> {
    const accounts: Account[] = []
    let shouldBreak = false
    let index = 0

    while (!shouldBreak) {
      const account = await this.getAccount(transport, index)

      if (index !== 0) {
        try {
          const { totalCount } = await this.#blockchainDataService.getTransactionsByAddress({
            address: account.address,
          })

          if (!totalCount || totalCount <= 0) shouldBreak = true
        } catch {
          shouldBreak = true
        }
      }

      accounts.push(account)
      index++
    }

    return accounts
  }

  async getAccount(transport: Transport, index: number): Promise<Account> {
    const bip44Buffer = this.#toBip44Buffer(index)
    const result = await transport.send(0x80, 0x04, 0x00, 0x00, bip44Buffer, [0x9000])
    const publicKey = result.toString('hex').substring(0, 130)
    const { address } = new wallet.Account(publicKey)

    return {
      address,
      key: publicKey,
      type: 'publicKey',
      derivationIndex: index,
    }
  }

  #toBip44Buffer(addressIndex = 0, changeIndex = 0, accountIndex = 0) {
    const accountHex = this.#to8BitHex(accountIndex + 0x80000000)
    const changeHex = this.#to8BitHex(changeIndex)
    const addressHex = this.#to8BitHex(addressIndex)

    return Buffer.from('8000002C' + '80000378' + accountHex + changeHex + addressHex, 'hex')
  }

  #to8BitHex(num: number): string {
    const hex = num.toString(16)
    return '0'.repeat(8 - hex.length) + hex
  }

  #derSignatureToHex(response: string): string {
    const ss = new u.StringStream(response)
    // The first byte is format. It is usually 0x30 (SEQ) or 0x31 (SET)
    // The second byte represents the total length of the DER module.
    ss.read(2)
    // Now we read each field off
    // Each field is encoded with a type byte, length byte followed by the data itself
    ss.read(1) // Read and drop the type
    const r = ss.readVarBytes()
    ss.read(1)
    const s = ss.readVarBytes()

    // We will need to ensure both integers are 32 bytes long
    const integers = [r, s].map(i => {
      if (i.length < 64) {
        i = '0'.repeat(i.length - 64) + i
      }
      if (i.length > 64) {
        i = i.substr(-64)
      }
      return i
    })

    return integers.join('')
  }
}
