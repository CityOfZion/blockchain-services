import {
  generateAccountForBlockchainService,
  BSUtilsHelper,
  BSKeychainHelper,
  type TBSAccount,
  type TLedgerServiceEmitter,
  type TGetLedgerTransport,
  type TUntilIndexRecord,
  type ILedgerService,
} from '@cityofzion/blockchain-service'
import Transport from '@ledgerhq/hw-transport'
import LedgerEthereumApp, { ledgerService as LedgerEthereumAppService } from '@ledgerhq/hw-app-eth'
import { ethers, Signer } from 'ethers'
import { TypedDataSigner } from '@ethersproject/abstract-signer'
import { defineReadOnly } from '@ethersproject/properties'
import EventEmitter from 'events'
import { BSEthereum } from '../../BSEthereum'

export class EthersLedgerSigner extends Signer implements TypedDataSigner {
  static shouldRetry = (error: any): boolean => {
    return error?.id === 'TransportLocked'
  }

  #transport: Transport
  #emitter?: TLedgerServiceEmitter
  #bip44Path: string
  #ledgerApp: LedgerEthereumApp

  constructor(
    transport: Transport,
    bip44Path: string,
    provider?: ethers.providers.Provider,
    emitter?: TLedgerServiceEmitter
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
    const { address } = await BSUtilsHelper.retry(() => this.#ledgerApp.getAddress(this.#bip44Path), {
      shouldRetry: EthersLedgerSigner.shouldRetry,
    })

    return address
  }

  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    try {
      if (typeof message === 'string') {
        message = ethers.utils.toUtf8Bytes(message)
      }

      this.#emitter?.emit('getSignatureStart')

      const obj = await this.#ledgerApp.signPersonalMessage(this.#bip44Path, ethers.utils.hexlify(message).substring(2))

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

      const serializedUnsignedTransaction = ethers.utils
        .serializeTransaction(<ethers.utils.UnsignedTransaction>tx)
        .substring(2)

      const resolution = await LedgerEthereumAppService.resolveTransaction(serializedUnsignedTransaction, {}, {})

      this.#emitter?.emit('getSignatureStart')

      const signature = await this.#ledgerApp.signTransaction(
        this.#bip44Path,
        serializedUnsignedTransaction,
        resolution
      )

      this.#emitter?.emit('getSignatureEnd')

      return ethers.utils.serializeTransaction(<ethers.utils.UnsignedTransaction>tx, {
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
        obj = await this.#ledgerApp.signEIP712Message(this.#bip44Path, payload)
      } catch {
        const domainSeparatorHex = ethers.utils._TypedDataEncoder.hashDomain(payload.domain)
        const hashStructMessageHex = ethers.utils._TypedDataEncoder.hashStruct(
          payload.primaryType,
          types,
          payload.message
        )
        obj = await this.#ledgerApp.signEIP712HashedMessage(this.#bip44Path, domainSeparatorHex, hashStructMessageHex)
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

export class EthersLedgerServiceEthereum<N extends string> implements ILedgerService<N> {
  #blockchainService: BSEthereum<N>
  emitter: TLedgerServiceEmitter = new EventEmitter() as TLedgerServiceEmitter
  getLedgerTransport?: TGetLedgerTransport<N>

  constructor(blockchainService: BSEthereum<N>, getLedgerTransport?: TGetLedgerTransport<N>) {
    this.#blockchainService = blockchainService
    this.getLedgerTransport = getLedgerTransport
  }

  async getAccounts(
    transport: Transport,
    untilIndexByBlockchainService?: TUntilIndexRecord<N>
  ): Promise<TBSAccount<N>[]> {
    const accountsByBlockchainService = await generateAccountForBlockchainService(
      [this.#blockchainService],
      async (_service, index) => {
        return this.getAccount(transport, index)
      },
      untilIndexByBlockchainService
    )

    const accounts = accountsByBlockchainService.get(this.#blockchainService.name)
    return accounts ?? []
  }

  async getAccount(transport: Transport, index: number): Promise<TBSAccount<N>> {
    const ledgerApp = new LedgerEthereumApp(transport)
    const bipPath = BSKeychainHelper.getBipPath(this.#blockchainService.bipDerivationPath, index)

    const { publicKey, address } = await BSUtilsHelper.retry(() => ledgerApp.getAddress(bipPath), {
      shouldRetry: EthersLedgerSigner.shouldRetry,
    })

    const publicKeyWithPrefix = '0x' + publicKey

    return {
      address,
      key: publicKeyWithPrefix,
      type: 'publicKey',
      bipPath,
      blockchain: this.#blockchainService.name,
      isHardware: true,
    }
  }

  getSigner(transport: Transport, path: string, provider?: ethers.providers.Provider): EthersLedgerSigner {
    return new EthersLedgerSigner(transport, path, provider, this.emitter)
  }
}
