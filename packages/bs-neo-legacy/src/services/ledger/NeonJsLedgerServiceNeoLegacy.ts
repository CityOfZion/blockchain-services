import {
  Account,
  generateAccountForBlockchainService,
  GetLedgerTransport,
  ILedgerService,
  LedgerServiceEmitter,
  UntilIndexRecord,
} from '@cityofzion/blockchain-service'
import { BSNeoLegacy } from '../../BSNeoLegacy'
import EventEmitter from 'events'
import Transport from '@ledgerhq/hw-transport'
import { wallet, u, tx } from '@cityofzion/neon-js'
import {
  ENeonJsLedgerServiceNeoLegacyCommand,
  ENeonJsLedgerServiceNeoLegacyParameter,
  ENeonJsLedgerServiceNeoLegacyStatus,
} from '../../types'

export class NeonJsLedgerServiceNeoLegacy<N extends string = string> implements ILedgerService<N> {
  readonly #service: BSNeoLegacy<N>
  readonly getLedgerTransport?: GetLedgerTransport<N>
  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter

  constructor(blockchainService: BSNeoLegacy<N>, getLedgerTransport?: GetLedgerTransport<N>) {
    this.#service = blockchainService
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccount(transport: Transport, index: number): Promise<Account<N>> {
    const bip44Path = this.#service.bip44DerivationPath.replace('?', index.toString())
    const bip44PathHex = this.#bip44PathToHex(bip44Path)

    const result = await this.#sendChunk(
      transport,
      ENeonJsLedgerServiceNeoLegacyCommand.GET_PUBLIC_KEY,
      ENeonJsLedgerServiceNeoLegacyParameter.LAST_DATA,
      bip44PathHex
    )

    const publicKey = result.toString('hex').substring(0, 130)
    const { address } = new wallet.Account(publicKey)

    return {
      address,
      key: publicKey,
      type: 'publicKey',
      bip44Path,
      blockchain: this.#service.name,
      isHardware: true,
    }
  }

  async getAccounts(transport: Transport, untilIndexByBlockchainService?: UntilIndexRecord<N>): Promise<Account<N>[]> {
    const accountsByBlockchainService = await generateAccountForBlockchainService(
      [this.#service],
      async (_service, index) => {
        return this.getAccount(transport, index)
      },
      untilIndexByBlockchainService
    )

    const accounts = accountsByBlockchainService.get(this.#service.name)
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
          await this.#sendChunk(
            transport,
            ENeonJsLedgerServiceNeoLegacyCommand.SIGN,
            ENeonJsLedgerServiceNeoLegacyParameter.MORE_DATA,
            chunks[i]
          )
        }

        // Send the last chunk signaling that it is the last one and get the signature
        const response = await this.#sendChunk(
          transport,
          ENeonJsLedgerServiceNeoLegacyCommand.SIGN,
          ENeonJsLedgerServiceNeoLegacyParameter.LAST_DATA,
          chunks[chunks.length - 1]
        )

        if (response.readUIntBE(0, 2) === ENeonJsLedgerServiceNeoLegacyStatus.OK) {
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

  #sendChunk(
    transport: Transport,
    command: ENeonJsLedgerServiceNeoLegacyCommand,
    parameter: ENeonJsLedgerServiceNeoLegacyParameter,
    chunk: string
  ) {
    return transport.send(0x80, command, parameter, 0x00, Buffer.from(chunk, 'hex'), [
      ENeonJsLedgerServiceNeoLegacyStatus.OK,
    ])
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
