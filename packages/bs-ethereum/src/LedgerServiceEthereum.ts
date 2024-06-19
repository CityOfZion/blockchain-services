import { Account, LedgerService, LedgerServiceEmitter } from '@cityofzion/blockchain-service'
import Transport from '@ledgerhq/hw-transport'
import LedgerEthereumApp, { ledgerService as LedgerEthereumAppService } from '@ledgerhq/hw-app-eth'
import { ethers, Signer } from 'ethers'
import { TypedDataSigner } from '@ethersproject/abstract-signer'
import { defineReadOnly } from '@ethersproject/properties'
import { DEFAULT_PATH } from './constants'
import EventEmitter from 'events'

export class LedgerSigner extends Signer implements TypedDataSigner {
  #transport: Transport
  #emitter?: LedgerServiceEmitter
  #path: string

  constructor(transport: Transport, provider?: ethers.providers.Provider, emitter?: LedgerServiceEmitter) {
    super()

    this.#path = DEFAULT_PATH
    this.#transport = transport
    this.#emitter = emitter
    defineReadOnly(this, 'provider', provider)
  }

  connect(provider: ethers.providers.Provider): LedgerSigner {
    return new LedgerSigner(this.#transport, provider)
  }

  #retry<T = any>(callback: () => Promise<T>): Promise<T> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      // Wait up to 5 seconds
      for (let i = 0; i < 50; i++) {
        try {
          const result = await callback()
          return resolve(result)
        } catch (error: any) {
          if (error.id !== 'TransportLocked') {
            return reject(error)
          }
        }
        await wait(100)
      }

      return reject(new Error('timeout'))
    })
  }

  async getAddress(): Promise<string> {
    const ledgerApp = new LedgerEthereumApp(this.#transport)
    const { address } = await this.#retry(() => ledgerApp.getAddress(this.#path))
    return ethers.utils.getAddress(address)
  }

  async getPublicKey(): Promise<string> {
    const ledgerApp = new LedgerEthereumApp(this.#transport)
    const { publicKey } = await this.#retry(() => ledgerApp.getAddress(this.#path))
    return '0x' + publicKey
  }

  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    if (typeof message === 'string') {
      message = ethers.utils.toUtf8Bytes(message)
    }

    const ledgerApp = new LedgerEthereumApp(this.#transport)

    this.#emitter?.emit('getSignatureStart')

    const obj = await this.#retry(() =>
      ledgerApp.signPersonalMessage(this.#path, ethers.utils.hexlify(message).substring(2))
    )

    this.#emitter?.emit('getSignatureEnd')

    // Normalize the signature for Ethers
    obj.r = '0x' + obj.r
    obj.s = '0x' + obj.s

    return ethers.utils.joinSignature(obj)
  }

  async signTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
    const ledgerApp = new LedgerEthereumApp(this.#transport)

    const tx = await ethers.utils.resolveProperties(transaction)
    const unsignedTransaction: ethers.utils.UnsignedTransaction = {
      ...tx,
      nonce: tx.nonce ? ethers.BigNumber.from(transaction.nonce).toNumber() : undefined,
    }

    const serializedUnsignedTransaction = ethers.utils.serializeTransaction(unsignedTransaction).substring(2)

    const resolution = await LedgerEthereumAppService.resolveTransaction(serializedUnsignedTransaction, {}, {})

    this.#emitter?.emit('getSignatureStart')

    const signature = await this.#retry(() =>
      ledgerApp.signTransaction(this.#path, serializedUnsignedTransaction, resolution)
    )

    this.#emitter?.emit('getSignatureEnd')

    return ethers.utils.serializeTransaction(unsignedTransaction, {
      v: ethers.BigNumber.from('0x' + signature.v).toNumber(),
      r: '0x' + signature.r,
      s: '0x' + signature.s,
    })
  }

  async _signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    const populated = await ethers.utils._TypedDataEncoder.resolveNames(domain, types, value, async (name: string) => {
      if (!this.provider) throw new Error('Cannot resolve ENS names without a provider')
      const resolved = await this.provider.resolveName(name)
      if (!resolved) throw new Error('No address found for domain name')
      return resolved
    })

    const payload = ethers.utils._TypedDataEncoder.getPayload(populated.domain, types, populated.value)

    const ledgerApp = new LedgerEthereumApp(this.#transport)

    this.#emitter?.emit('getSignatureStart')
    const obj = await this.#retry(() => ledgerApp.signEIP712Message(this.#path, payload))
    this.#emitter?.emit('getSignatureEnd')

    // Normalize the signature for Ethers
    obj.r = '0x' + obj.r
    obj.s = '0x' + obj.s

    return ethers.utils.joinSignature(obj)
  }
}

export class LedgerServiceEthereum implements LedgerService {
  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter

  constructor(public getLedgerTransport?: (account: Account) => Promise<Transport>) {}

  async getAddress(transport: Transport): Promise<string> {
    const signer = new LedgerSigner(transport)
    return await signer.getAddress()
  }

  async getPublicKey(transport: Transport): Promise<string> {
    const signer = new LedgerSigner(transport)
    return await signer.getPublicKey()
  }

  getSigner(transport: Transport): LedgerSigner {
    return new LedgerSigner(transport, undefined, this.emitter)
  }
}

function wait(duration: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}
