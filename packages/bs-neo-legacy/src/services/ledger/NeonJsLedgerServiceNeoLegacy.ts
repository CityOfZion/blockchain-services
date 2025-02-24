import {
  Account,
  fetchAccountsForBlockchainServices,
  generateAccountUntilIndexForBlockchainService,
  GetLedgerTransport,
  LedgerService,
  LedgerServiceEmitter,
} from '@cityofzion/blockchain-service'
import { BSNeoLegacy } from '../BSNeoLegacy'
import EventEmitter from 'events'
import Transport from '@ledgerhq/hw-transport'
import { wallet, u, tx } from '@cityofzion/neon-js'

enum LedgerStatus {
  OK = 0x9000,
}

enum LedgerCommand {
  GET_PUBLIC_KEY = 0x04,
  SIGN = 0x02,
}

enum LedgerParameter {
  MORE_DATA = 0x00,
  LAST_DATA = 0x80,
}

export class NeonJsLedgerServiceNeoLegacy<BSName extends string = string> implements LedgerService<BSName> {
  #blockchainService: BSNeoLegacy<BSName>

  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter
  getLedgerTransport?: GetLedgerTransport<BSName>

  constructor(blockchainService: BSNeoLegacy<BSName>, getLedgerTransport?: GetLedgerTransport<BSName>) {
    this.#blockchainService = blockchainService
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccount(transport: Transport, index: number): Promise<Account<BSName>> {
    const bip44Path = this.#blockchainService.bip44DerivationPath.replace('?', index.toString())
    const bip44PathHex = this.#bip44PathToHex(bip44Path)

    const result = await this.#sendChunk(
      transport,
      LedgerCommand.GET_PUBLIC_KEY,
      LedgerParameter.LAST_DATA,
      bip44PathHex
    )

    const publicKey = result.toString('hex').substring(0, 130)
    const { address } = new wallet.Account(publicKey)

    return {
      address,
      key: publicKey,
      type: 'publicKey',
      bip44Path,
      blockchain: this.#blockchainService.name,
      isHardware: true,
    }
  }

  async getAccounts(transport: Transport, untilIndex?: number): Promise<Account<BSName>[]> {
    let accountsByBlockchainService: Map<string, Account<BSName>[]>

    if (untilIndex === undefined) {
      accountsByBlockchainService = await fetchAccountsForBlockchainServices(
        [this.#blockchainService],
        async (_service, index) => {
          return this.getAccount(transport, index)
        }
      )
    } else {
      accountsByBlockchainService = await generateAccountUntilIndexForBlockchainService(
        [this.#blockchainService],
        untilIndex,
        async (_service, index) => {
          return this.getAccount(transport, index)
        }
      )
    }

    const accounts = accountsByBlockchainService.get(this.#blockchainService.name)
    return accounts ?? []
  }

  getSigningCallback(
    transport: Transport,
    account: Account
  ): (transaction: string, publicKey: string) => Promise<string | string[]> {
    return async (transaction, publicKey) => {
      try {
        this.emitter.emit('getSignatureStart')

        if (!account.bip44Path) {
          throw new Error('Account must have a bip 44 path to sign with Ledger')
        }

        const neonJsAccount = new wallet.Account(account.key)

        const witnessScriptHash = wallet.getScriptHashFromPublicKey(publicKey)

        if (neonJsAccount.scriptHash !== witnessScriptHash) {
          throw new Error('Public key does not match the account key')
        }

        const bip44PathHex = this.#bip44PathToHex(account.bip44Path)

        const payload = transaction + bip44PathHex

        // Split the serialized transaction into chunks of 510 bytes
        const chunks = payload.match(/.{1,510}/g) || []

        // Send all chunks except the last one
        for (let i = 0; i < chunks.length - 1; i++) {
          await this.#sendChunk(transport, LedgerCommand.SIGN, LedgerParameter.MORE_DATA, chunks[i])
        }

        // Send the last chunk signaling that it is the last one and get the signature
        const response = await this.#sendChunk(
          transport,
          LedgerCommand.SIGN,
          LedgerParameter.LAST_DATA,
          chunks[chunks.length - 1]
        )

        if (response.readUIntBE(0, 2) === LedgerStatus.OK) {
          throw new Error('No more data but Ledger did not return signature!')
        }

        const signature = this.#derSignatureToHex(response.toString('hex'))
        const witness = tx.Witness.fromSignature(signature, publicKey)
        return witness.serialize()
      } finally {
        this.emitter.emit('getSignatureEnd')
      }
    }
  }

  #sendChunk(transport: Transport, command: LedgerCommand, parameter: LedgerParameter, chunk: string) {
    return transport.send(0x80, command, parameter, 0x00, Buffer.from(chunk, 'hex'), [LedgerStatus.OK])
  }

  #bip44PathToHex(path: string): string {
    let result = ''
    const components = path.split('/')

    components.forEach(element => {
      let number = parseInt(element, 10)

      if (isNaN(number)) {
        return
      }

      if (element.length > 1 && element[element.length - 1] === "'") {
        number += 0x80000000
      }

      result += number.toString(16).padStart(8, '0')
    })

    return result
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
