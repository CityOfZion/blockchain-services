import { Account, LedgerService, LedgerServiceEmitter } from '@cityofzion/blockchain-service'
import { NeonParser } from '@cityofzion/neon-dappkit'
import { api, u, wallet } from '@cityofzion/neon-js'
import Transport from '@ledgerhq/hw-transport'
import EventEmitter from 'events'

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

export class NeonDappKitLedgerServiceNeo3 implements LedgerService {
  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter

  constructor(public getLedgerTransport?: (account: Account) => Promise<Transport>) {}

  async getAddress(transport: Transport): Promise<string> {
    const publicKey = await this.getPublicKey(transport)
    const { address } = new wallet.Account(publicKey)

    return address
  }

  getSigningCallback(transport: Transport): api.SigningFunction {
    return async (transaction, { witnessIndex, network }) => {
      const publicKey = await this.getPublicKey(transport)
      const account = new wallet.Account(publicKey)

      const witnessScriptHash = wallet.getScriptHashFromVerificationScript(
        transaction.witnesses[witnessIndex].verificationScript.toString()
      )

      if (account.scriptHash !== witnessScriptHash) {
        throw new Error('Invalid witness script hash')
      }

      const signature = await this.getSignature(transport, transaction.serialize(false), network, witnessIndex)

      return signature
    }
  }

  async getSignature(transport: Transport, serializedTransaction: string, networkMagic: number, addressIndex = 0) {
    try {
      this.emitter.emit('getSignatureStart')

      const bip44 = this.#toBip44(addressIndex)
      // Send the BIP44 account as first chunk
      await this.#sendChunk(transport, LedgerCommand.SIGN, 0, LedgerSecondParameter.MORE_DATA, bip44)

      // Send the network magic as second chunk
      await this.#sendChunk(
        transport,
        LedgerCommand.SIGN,
        1,
        LedgerSecondParameter.MORE_DATA,
        NeonParser.numToHex(networkMagic, 4, true)
      )

      const chunks = serializedTransaction.match(/.{1,510}/g) || []

      for (let i = 0; i < chunks.length - 1; i++) {
        // We plus 2 because we already sent 2 chunks before
        const commandIndex = 2 + i
        await this.#sendChunk(transport, LedgerCommand.SIGN, commandIndex, LedgerSecondParameter.MORE_DATA, chunks[i])
      }

      // Again we plus 2 because we already sent 2 chunks before getting the chunks
      const lastChunkIndex = 2 + chunks.length
      const response = await this.#sendChunk(
        transport,
        LedgerCommand.SIGN,
        lastChunkIndex,
        LedgerSecondParameter.LAST_DATA,
        chunks[chunks.length - 1]
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

  async getPublicKey(transport: Transport, addressIndex = 0): Promise<string> {
    const bip44 = this.#toBip44(addressIndex)

    const result = await this.#sendChunk(
      transport,
      LedgerCommand.GET_PUBLIC_KEY,
      0x00,
      LedgerSecondParameter.LAST_DATA,
      bip44
    )
    const publicKey = result.toString('hex').substring(0, 130)

    return publicKey
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

  #toBip44(addressIndex = 0, changeIndex = 0, accountIndex = 0) {
    const accountHex = this.#to8BitHex(accountIndex + 0x80000000)
    const changeHex = this.#to8BitHex(changeIndex)
    const addressHex = this.#to8BitHex(addressIndex)

    return '8000002C' + '80000378' + accountHex + changeHex + addressHex
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
