import {
  Account,
  fetchAccountsForBlockchainServices,
  GetLedgerTransport,
  LedgerService,
  LedgerServiceEmitter,
} from '@cityofzion/blockchain-service'
import { NeonParser } from '@cityofzion/neon-dappkit'
import { api, u, wallet } from '@cityofzion/neon-js'
import Transport from '@ledgerhq/hw-transport'
import EventEmitter from 'events'
import { BSNeo3 } from '../../BSNeo3'

enum LedgerStatus {
  OK = 0x9000,
}

enum LedgerCommand {
  GET_PUBLIC_KEY = 0x04,
  SIGN = 0x02,
}

enum LedgerSecondParameter {
  MORE_DATA = 0x80,
  LAST_DATA = 0x00,
}

export class NeonDappKitLedgerServiceNeo3<BSName extends string = string> implements LedgerService<BSName> {
  #blockchainService: BSNeo3<BSName>

  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter
  getLedgerTransport?: GetLedgerTransport<BSName>

  constructor(blockchainService: BSNeo3<BSName>, getLedgerTransport?: GetLedgerTransport<BSName>) {
    this.#blockchainService = blockchainService
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccount(transport: Transport, index: number): Promise<Account<BSName>> {
    const bip44Path = this.#blockchainService.bip44DerivationPath.replace('?', index.toString())
    const bip44PathHex = this.#bip44PathToHex(bip44Path)

    const result = await this.#sendChunk(
      transport,
      LedgerCommand.GET_PUBLIC_KEY,
      0x00,
      LedgerSecondParameter.LAST_DATA,
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

  async getAccounts(transport: Transport): Promise<Account<BSName>[]> {
    const accountsByBlockchainService = await fetchAccountsForBlockchainServices<BSName>(
      [this.#blockchainService],
      async (_service, index) => {
        return this.getAccount(transport, index)
      }
    )

    const accounts = accountsByBlockchainService.get(this.#blockchainService.name)
    return accounts ?? []
  }

  getSigningCallback(transport: Transport, account: Account): api.SigningFunction {
    return async (transaction, { witnessIndex, network }) => {
      try {
        this.emitter.emit('getSignatureStart')

        if (!account.bip44Path) {
          throw new Error('Account must have a bip 44 path to sign with Ledger')
        }

        const neonJsAccount = new wallet.Account(account.key)

        const witnessScriptHash = wallet.getScriptHashFromVerificationScript(
          transaction.witnesses[witnessIndex].verificationScript.toString()
        )

        if (neonJsAccount.scriptHash !== witnessScriptHash) {
          throw new Error('Invalid witness script hash')
        }

        const bip44PathHex = this.#bip44PathToHex(account.bip44Path)

        // Send the BIP44 account as first chunk
        await this.#sendChunk(transport, LedgerCommand.SIGN, 0, LedgerSecondParameter.MORE_DATA, bip44PathHex)

        // Send the network magic as second chunk
        await this.#sendChunk(
          transport,
          LedgerCommand.SIGN,
          1,
          LedgerSecondParameter.MORE_DATA,
          NeonParser.numToHex(network, 4, true)
        )

        const serializedTransaction = transaction.serialize(false)

        // Split the serialized transaction into chunks of 510 bytes
        const chunks = serializedTransaction.match(/.{1,510}/g) || []

        // Send all chunks except the last one
        for (let i = 0; i < chunks.length - 1; i++) {
          // We plus 2 because we already sent 2 chunks before
          const commandIndex = 2 + i
          await this.#sendChunk(transport, LedgerCommand.SIGN, commandIndex, LedgerSecondParameter.MORE_DATA, chunks[i])
        }

        // Again, we plus 2 because we already sent 2 chunks before getting the chunks
        const lastChunkIndex = 2 + chunks.length

        // Send the last chunk signaling that it is the last one and get the signature
        const response = await this.#sendChunk(
          transport,
          LedgerCommand.SIGN,
          lastChunkIndex,
          LedgerSecondParameter.LAST_DATA,
          chunks[chunks.length - 1]
        )

        if (response.length <= 2) {
          throw new Error('Invalid signature returned from Ledger')
        }

        return this.#derSignatureToHex(response.toString('hex'))
      } finally {
        this.emitter.emit('getSignatureEnd')
      }
    }
  }

  #sendChunk(
    transport: Transport,
    command: LedgerCommand,
    commandIndex: number,
    secondParameter: LedgerSecondParameter,
    chunk: string
  ) {
    return transport.send(0x80, command, commandIndex, secondParameter, Buffer.from(chunk, 'hex'), [LedgerStatus.OK])
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
