import {
  TBSAccount,
  generateAccountForBlockchainService,
  TGetLedgerTransport,
  ILedgerService,
  TLedgerServiceEmitter,
  TUntilIndexRecord,
} from '@cityofzion/blockchain-service'
import { NeonParser } from '@cityofzion/neon-dappkit'
import { api, u, wallet } from '@cityofzion/neon-js'
import Transport from '@ledgerhq/hw-transport'
import EventEmitter from 'events'
import { BSNeo3 } from '../../BSNeo3'
import {
  ENeonDappKitLedgerServiceNeo3Command,
  ENeonDappKitLedgerServiceNeo3SecondParameter,
  ENeonDappKitLedgerServiceNeo3Status,
  IBSNeo3,
} from '../../types'

export class NeonDappKitLedgerServiceNeo3<N extends string = string> implements ILedgerService<N> {
  readonly #service: IBSNeo3<N>
  readonly getLedgerTransport?: TGetLedgerTransport<N>

  emitter: TLedgerServiceEmitter = new EventEmitter() as TLedgerServiceEmitter

  constructor(blockchainService: IBSNeo3<N>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.#service = blockchainService
    this.getLedgerTransport = getLedgerTransport
  }

  // This verification is necessary because the NEO2 Ledger App also detects NEO3
  async verifyAppName(transport: Transport): Promise<boolean> {
    try {
      const response = await this.#sendChunk(
        transport,
        ENeonDappKitLedgerServiceNeo3Command.GET_APP_NAME,
        0x00,
        ENeonDappKitLedgerServiceNeo3SecondParameter.LAST_DATA,
        undefined
      )
      const version = response.toString('ascii')
      const appName = version.substring(0, version.length - 2)

      if (appName !== 'NEO N3') return false

      return true
    } catch {
      return false
    }
  }

  async getAccount(transport: Transport, index: number): Promise<TBSAccount<N>> {
    const bip44Path = this.#service.bip44DerivationPath.replace('?', index.toString())
    const bip44PathHex = this.#bip44PathToHex(bip44Path)

    const isNeoN3App = await this.verifyAppName(transport)
    if (!isNeoN3App) throw new Error('App is not NEO N3')

    const result = await this.#sendChunk(
      transport,
      ENeonDappKitLedgerServiceNeo3Command.GET_PUBLIC_KEY,
      0x00,
      ENeonDappKitLedgerServiceNeo3SecondParameter.LAST_DATA,
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

  async getAccounts(
    transport: Transport,
    untilIndexByBlockchainService?: TUntilIndexRecord<N>
  ): Promise<TBSAccount<N>[]> {
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

  getSigningCallback(transport: Transport, account: TBSAccount): api.SigningFunction {
    return async (transaction, { witnessIndex, network }) => {
      const isNeoN3App = await this.verifyAppName(transport)
      if (!isNeoN3App) throw new Error('App is not NEO N3')

      try {
        this.emitter.emit('getSignatureStart')

        if (!account.bip44Path) {
          throw new Error('TBSAccount must have a bip 44 path to sign with Ledger')
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
        await this.#sendChunk(
          transport,
          ENeonDappKitLedgerServiceNeo3Command.SIGN,
          0,
          ENeonDappKitLedgerServiceNeo3SecondParameter.MORE_DATA,
          bip44PathHex
        )

        // Send the network magic as second chunk
        await this.#sendChunk(
          transport,
          ENeonDappKitLedgerServiceNeo3Command.SIGN,
          1,
          ENeonDappKitLedgerServiceNeo3SecondParameter.MORE_DATA,
          NeonParser.numToHex(network, 4, true)
        )

        const serializedTransaction = transaction.serialize(false)

        // Split the serialized transaction into chunks of 510 bytes
        const chunks = serializedTransaction.match(/.{1,510}/g) || []

        // Send all chunks except the last one
        for (let i = 0; i < chunks.length - 1; i++) {
          // We plus 2 because we already sent 2 chunks before
          const commandIndex = 2 + i
          await this.#sendChunk(
            transport,
            ENeonDappKitLedgerServiceNeo3Command.SIGN,
            commandIndex,
            ENeonDappKitLedgerServiceNeo3SecondParameter.MORE_DATA,
            chunks[i]
          )
        }

        // Again, we plus 2 because we already sent 2 chunks before getting the chunks
        const lastChunkIndex = 2 + chunks.length

        // Send the last chunk signaling that it is the last one and get the signature
        const response = await this.#sendChunk(
          transport,
          ENeonDappKitLedgerServiceNeo3Command.SIGN,
          lastChunkIndex,
          ENeonDappKitLedgerServiceNeo3SecondParameter.LAST_DATA,
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
    command: ENeonDappKitLedgerServiceNeo3Command,
    commandIndex: number,
    secondParameter: ENeonDappKitLedgerServiceNeo3SecondParameter,
    chunk?: string
  ) {
    return transport.send(0x80, command, commandIndex, secondParameter, chunk ? Buffer.from(chunk, 'hex') : undefined, [
      ENeonDappKitLedgerServiceNeo3Status.OK,
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
