import {
  Account,
  LedgerService,
  LedgerServiceEmitter,
  fetchAccountsForBlockchainServices,
} from '@cityofzion/blockchain-service'
import Transport from '@ledgerhq/hw-transport'
import LedgerEthereumApp, { ledgerService as LedgerEthereumAppService } from '@ledgerhq/hw-app-eth'
import { ethers, Signer } from 'ethers'
import { TypedDataSigner } from '@ethersproject/abstract-signer'
import { defineReadOnly } from '@ethersproject/properties'
import EventEmitter from 'events'
import { BSEthereum } from '../../BSEthereum'
import { BSEthereumHelper } from '../../helpers/BSEthereumHelper'

export class EthersLedgerSigner extends Signer implements TypedDataSigner {
  #transport: Transport
  #emitter?: LedgerServiceEmitter
  #bip44Path: string
  #ledgerApp: LedgerEthereumApp

  constructor(
    transport: Transport,
    bip44Path: string,
    provider?: ethers.providers.Provider,
    emitter?: LedgerServiceEmitter
  ) {
    super()

    this.#bip44Path = bip44Path
    this.#transport = transport
    this.#emitter = emitter
    this.#ledgerApp = new LedgerEthereumApp(transport)

    defineReadOnly(this, 'provider', provider)
  }

  connect(provider: ethers.providers.Provider): EthersLedgerSigner {
    return new EthersLedgerSigner(this.#transport, this.#bip44Path, provider, this.#emitter)
  }

  async getAddress(): Promise<string> {
    const { address } = await this.#ledgerApp.getAddress(this.#bip44Path)
    return address
  }

  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    try {
      if (typeof message === 'string') {
        message = ethers.utils.toUtf8Bytes(message)
      }

      this.#emitter?.emit('getSignatureStart')

      const obj = await BSEthereumHelper.retry(() =>
        this.#ledgerApp.signPersonalMessage(this.#bip44Path, ethers.utils.hexlify(message).substring(2))
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

      const signature = await BSEthereumHelper.retry(() =>
        this.#ledgerApp.signTransaction(this.#bip44Path, serializedUnsignedTransaction, resolution)
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
        obj = await BSEthereumHelper.retry(() => this.#ledgerApp.signEIP712Message(this.#bip44Path, payload))
      } catch {
        const domainSeparatorHex = ethers.utils._TypedDataEncoder.hashDomain(payload.domain)
        const hashStructMessageHex = ethers.utils._TypedDataEncoder.hashStruct(
          payload.primaryType,
          types,
          payload.message
        )
        obj = await BSEthereumHelper.retry(() =>
          this.#ledgerApp.signEIP712HashedMessage(this.#bip44Path, domainSeparatorHex, hashStructMessageHex)
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

export class EthersLedgerServiceEthereum implements LedgerService {
  #blockchainService: BSEthereum
  emitter: LedgerServiceEmitter = new EventEmitter() as LedgerServiceEmitter
  getLedgerTransport?: (account: Account) => Promise<Transport>

  constructor(blockchainService: BSEthereum, getLedgerTransport?: (account: Account) => Promise<Transport>) {
    this.#blockchainService = blockchainService
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccounts(transport: Transport): Promise<Account[]> {
    const accountsByBlockchainService = await fetchAccountsForBlockchainServices(
      [this.#blockchainService],
      async (_service, index) => {
        return this.getAccount(transport, index)
      }
    )

    const accounts = accountsByBlockchainService.get(this.#blockchainService.blockchainName)
    return accounts ?? []
  }

  async getAccount(transport: Transport, index: number): Promise<Account> {
    const ledgerApp = new LedgerEthereumApp(transport)
    const bip44Path = this.#blockchainService.bip44DerivationPath.replace('?', index.toString())

    const { publicKey, address } = await BSEthereumHelper.retry(() => ledgerApp.getAddress(bip44Path))

    const publicKeyWithPrefix = '0x' + publicKey

    return {
      address,
      key: publicKeyWithPrefix,
      type: 'publicKey',
      bip44Path,
    }
  }

  getSigner(transport: Transport, path: string, provider?: ethers.providers.Provider): EthersLedgerSigner {
    return new EthersLedgerSigner(transport, path, provider, this.emitter)
  }
}
