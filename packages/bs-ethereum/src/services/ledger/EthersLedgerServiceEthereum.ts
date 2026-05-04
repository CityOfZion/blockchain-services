import {
  generateAccountForBlockchainService,
  BSUtilsHelper,
  BSKeychainHelper,
  type TBSAccount,
  type TLedgerServiceEmitter,
  type TGetLedgerTransport,
  type TUntilIndexRecord,
  type ILedgerService,
  BSBigNumber,
} from '@cityofzion/blockchain-service'
import Transport from '@ledgerhq/hw-transport'
import LedgerEthereumApp, { ledgerService as LedgerEthereumAppService } from '@ledgerhq/hw-app-eth'
import {
  ethers,
  hexlify,
  toUtf8Bytes,
  AbstractSigner,
  type Provider,
  Signature,
  Transaction,
  TypedDataEncoder,
  SignatureLike,
  TransactionLike,
} from 'ethers'
import { defineReadOnly } from '@ethersproject/properties'
import EventEmitter from 'events'
import { BSEthereum } from '../../BSEthereum'

const ensure0x = (value: string): string => {
  return value.startsWith('0x') ? value : `0x${value}`
}

export class EthersLedgerSigner extends AbstractSigner {
  #transport: Transport
  #emitter?: TLedgerServiceEmitter
  #bipPath: string
  #ledgerApp: LedgerEthereumApp

  constructor(transport: Transport, bipPath: string, provider?: Provider, emitter?: TLedgerServiceEmitter) {
    super(provider)

    this.#bipPath = bipPath
    this.#transport = transport
    this.#emitter = emitter
    this.#ledgerApp = new LedgerEthereumApp(transport)

    if (provider) defineReadOnly(this, 'provider', provider)
  }

  static shouldRetry(error: any): boolean {
    return error?.id === 'TransportLocked'
  }

  connect(provider: Provider): EthersLedgerSigner {
    return new EthersLedgerSigner(this.#transport, this.#bipPath, provider, this.#emitter)
  }

  async getAddress(): Promise<string> {
    const { address } = await BSUtilsHelper.retry(() => this.#ledgerApp.getAddress(this.#bipPath), {
      shouldRetry: EthersLedgerSigner.shouldRetry,
    })

    return address
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    try {
      if (typeof message === 'string') {
        message = toUtf8Bytes(message)
      }

      this.#emitter?.emit('getSignatureStart')

      const signature = await this.#ledgerApp.signPersonalMessage(this.#bipPath, hexlify(message).substring(2))

      this.#emitter?.emit('getSignatureEnd')

      signature.r = ensure0x(signature.r)
      signature.s = ensure0x(signature.s)

      return Signature.from(signature).serialized
    } catch (error) {
      this.#emitter?.emit('getSignatureEnd')
      throw error
    }
  }

  async signTransaction(transaction: Transaction | TransactionLike): Promise<string> {
    try {
      const { from: _from, ...transactionRecord } =
        transaction instanceof Transaction ? transaction.toJSON() : transaction

      const serializedUnsignedTransaction = Transaction.from(transactionRecord).unsignedSerialized.substring(2)

      const resolution = await LedgerEthereumAppService.resolveTransaction(serializedUnsignedTransaction, {}, {})

      this.#emitter?.emit('getSignatureStart')

      const signature = await this.#ledgerApp.signTransaction(this.#bipPath, serializedUnsignedTransaction, resolution)

      this.#emitter?.emit('getSignatureEnd')

      return Transaction.from({
        ...transactionRecord,
        signature: {
          v: BSBigNumber.ensureNumber(ensure0x(signature.v)),
          r: ensure0x(signature.r),
          s: ensure0x(signature.s),
        },
      }).serialized
    } catch (error) {
      this.#emitter?.emit('getSignatureEnd')

      throw error
    }
  }

  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    try {
      const populated = await TypedDataEncoder.resolveNames(domain, types, value, async (name: string) => {
        if (!this.provider) throw new Error('Cannot resolve ENS names without a provider')

        const resolved = await this.provider.resolveName(name)

        if (!resolved) throw new Error('No address found for domain name')

        return resolved
      })

      const payload = TypedDataEncoder.getPayload(populated.domain, types, populated.value)

      this.#emitter?.emit('getSignatureStart')

      let signature: SignatureLike

      try {
        signature = await this.#ledgerApp.signEIP712Message(this.#bipPath, payload)
      } catch {
        const domainSeparatorHex = TypedDataEncoder.hashDomain(payload.domain)
        const hashStructMessageHex = TypedDataEncoder.hashStruct(payload.primaryType, types, payload.message)

        signature = await this.#ledgerApp.signEIP712HashedMessage(
          this.#bipPath,
          domainSeparatorHex,
          hashStructMessageHex
        )
      }

      this.#emitter?.emit('getSignatureEnd')

      signature.r = ensure0x(signature.r)
      signature.s = ensure0x(signature.s)

      return Signature.from(signature).serialized
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

    const publicKeyWithPrefix = ensure0x(publicKey)

    return {
      address,
      key: publicKeyWithPrefix,
      type: 'publicKey',
      bipPath,
      blockchain: this.#blockchainService.name,
      isHardware: true,
    }
  }

  getSigner(transport: Transport, path: string, provider?: Provider): EthersLedgerSigner {
    return new EthersLedgerSigner(transport, path, provider, this.emitter)
  }
}
