import { Account, BlockchainDataService, LedgerService, LedgerServiceEmitter } from '@cityofzion/blockchain-service'
import Transport from '@ledgerhq/hw-transport'
import LedgerEthereumApp, { ledgerService as LedgerEthereumAppService } from '@ledgerhq/hw-app-eth'
import { ethers, Signer } from 'ethers'
import { TypedDataSigner } from '@ethersproject/abstract-signer'
import { defineReadOnly } from '@ethersproject/properties'
import { DERIVATION_PATH, PUBLIC_KEY_PREFIX } from './constants'
import EventEmitter from 'events'
import { retry } from './utils'

export class LedgerSigner extends Signer implements TypedDataSigner {
  #transport: Transport
  #emitter?: LedgerServiceEmitter
  #path: string
  #derivationIndex: number
  #ledgerApp: LedgerEthereumApp

  constructor(
    transport: Transport,
    derivationIndex: number,
    provider?: ethers.providers.Provider,
    emitter?: LedgerServiceEmitter
  ) {
    super()

    this.#derivationIndex = derivationIndex
    this.#path = DERIVATION_PATH.replace('?', derivationIndex.toString())
    this.#transport = transport
    this.#emitter = emitter
    this.#ledgerApp = new LedgerEthereumApp(transport)
    defineReadOnly(this, 'provider', provider)
  }

  connect(provider: ethers.providers.Provider): LedgerSigner {
    return new LedgerSigner(this.#transport, this.#derivationIndex, provider, this.#emitter)
  }

  async getAddress(): Promise<string> {
    const { address } = await this.#ledgerApp.getAddress(this.#path)
    return address
  }

  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    try {
      if (typeof message === 'string') {
        message = ethers.utils.toUtf8Bytes(message)
      }

      this.#emitter?.emit('getSignatureStart')

      const obj = await retry(() =>
        this.#ledgerApp.signPersonalMessage(this.#path, ethers.utils.hexlify(message).substring(2))
      )

      this.#emitter?.emit('getSignatureEnd')

      // Normalize the signature for Ethers
      obj.r = '0x' + obj.r
      obj.s = '0x' + obj.s

      return ethers.utils.joinSignature(obj)
    } catch (error) {
      this.#emitter?.emit('getSignatureEnd')
      throw error
    }
  }

  async signTransaction(transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>): Promise<string> {
    try {
      const tx = await ethers.utils.resolveProperties(transaction)
      const unsignedTransaction: ethers.utils.UnsignedTransaction = {
        chainId: tx.chainId ?? undefined,
        data: tx.data ?? undefined,
        gasLimit: tx.gasLimit ?? undefined,
        gasPrice: tx.gasPrice ?? undefined,
        nonce: tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined,
        to: tx.to ?? undefined,
        value: tx.value ?? undefined,
      }

      const serializedUnsignedTransaction = ethers.utils.serializeTransaction(unsignedTransaction).substring(2)

      const resolution = await LedgerEthereumAppService.resolveTransaction(serializedUnsignedTransaction, {}, {})

      this.#emitter?.emit('getSignatureStart')

      const signature = await retry(() =>
        this.#ledgerApp.signTransaction(this.#path, serializedUnsignedTransaction, resolution)
      )

      this.#emitter?.emit('getSignatureEnd')

      return ethers.utils.serializeTransaction(unsignedTransaction, {
        v: ethers.BigNumber.from('0x' + signature.v).toNumber(),
        r: '0x' + signature.r,
        s: '0x' + signature.s,
      })
    } catch (error) {
      this.#emitter?.emit('getSignatureEnd')
      throw error
    }
  }

  async _signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    try {
      const populated = await ethers.utils._TypedDataEncoder.resolveNames(
        domain,
        types,
        value,
        async (name: string) => {
          if (!this.provider) throw new Error('Cannot resolve ENS names without a provider')
          const resolved = await this.provider.resolveName(name)
          if (!resolved) throw new Error('No address found for domain name')
          return resolved
        }
      )

      const payload = ethers.utils._TypedDataEncoder.getPayload(populated.domain, types, populated.value)

      this.#emitter?.emit('getSignatureStart')

      let obj: { v: number; s: string; r: string }

      try {
        obj = await retry(() => this.#ledgerApp.signEIP712Message(this.#path, payload))
      } catch {
        const domainSeparatorHex = ethers.utils._TypedDataEncoder.hashDomain(payload.domain)
        const hashStructMessageHex = ethers.utils._TypedDataEncoder.hashStruct(
          payload.primaryType,
          types,
          payload.message
        )
        obj = await retry(() =>
          this.#ledgerApp.signEIP712HashedMessage(this.#path, domainSeparatorHex, hashStructMessageHex)
        )
      }

      this.#emitter?.emit('getSignatureEnd')

      // Normalize the signature for Ethers
      obj.r = '0x' + obj.r
      obj.s = '0x' + obj.s

      return ethers.utils.joinSignature(obj)
    } catch (error) {
      this.#emitter?.emit('getSignatureEnd')
      throw error
    }
  }
}

export class LedgerServiceEthereum implements LedgerService {
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
    const ledgerApp = new LedgerEthereumApp(transport)
    const { publicKey, address } = await retry(() =>
      ledgerApp.getAddress(DERIVATION_PATH.replace('?', index.toString()))
    )

    const publicKeyWithPrefix = PUBLIC_KEY_PREFIX + publicKey

    return {
      address,
      key: publicKeyWithPrefix,
      type: 'publicKey',
      derivationIndex: index,
    }
  }

  getSigner(transport: Transport, derivationIndex: number): LedgerSigner {
    return new LedgerSigner(transport, derivationIndex, undefined, this.emitter)
  }
}
