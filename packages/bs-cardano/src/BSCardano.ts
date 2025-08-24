import {
  Account,
  BSUtilsHelper,
  IBlockchainDataService,
  IExchangeDataService,
  ITokenService,
  TNetwork,
  Token,
  TransferParam,
} from '@cityofzion/blockchain-service'
import { IBSCardano, TBSCardanoNetworkId } from './types'
import { BSCardanoConstants } from './constants/BSCardanoConstants'
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs'
import * as bip39 from 'bip39'

export class BSCardano<N extends string = string> implements IBSCardano<N> {
  readonly name: N
  readonly bip44DerivationPath: string
  readonly isMultiTransferSupported: boolean
  readonly isCustomNetworkSupported: boolean

  readonly feeToken!: Token
  readonly tokens!: Token[]
  readonly nativeTokens!: Token[]

  network!: TNetwork<TBSCardanoNetworkId>
  readonly defaultNetwork: TNetwork<TBSCardanoNetworkId>
  readonly availableNetworks: TNetwork<TBSCardanoNetworkId>[]

  exchangeDataService!: IExchangeDataService
  blockchainDataService!: IBlockchainDataService
  tokenService!: ITokenService

  constructor(name: N, network?: TNetwork<TBSCardanoNetworkId>) {
    this.name = name
    this.bip44DerivationPath = BSCardanoConstants.DEFAULT_BIP44_DERIVATION_PATH
    this.isMultiTransferSupported = true
    this.isCustomNetworkSupported = false

    // TODO: Define Cardano native token
    //     this.tokens = [BSSolanaConstants.NATIVE_TOKEN]
    // this.nativeTokens = [BSSolanaConstants.NATIVE_TOKEN]
    // this.feeToken = BSSolanaConstants.NATIVE_TOKEN

    this.availableNetworks = BSCardanoConstants.ALL_NETWORKS
    this.defaultNetwork = this.availableNetworks[0]

    this.setNetwork(network ?? this.defaultNetwork)
  }

  setNetwork(network: TNetwork<TBSCardanoNetworkId>): void {
    this.network = network
  }

  async testNetwork(network: TNetwork<TBSCardanoNetworkId>): Promise<void> {
    throw new Error('Method not implemented.')
  }

  validateAddress(address: string): boolean {
    try {
      CardanoWasm.Address.from_bech32(address)
      return true
    } catch {
      return false
    }
  }

  validateKey(key: string): boolean {
    throw new Error('Method not implemented.')
    // try {
    //   const bytes = Buffer.from(key, 'hex')
    //   if (bytes.length !== 64) return false // must be 64 bytes for Ed25519 extended key
    //   const p = CardanoWasm.PrivateKey.from(bytes)
    //   const pubKey = key.to_public() // derive public key
    //   // optional: derive address to double-check
    //   return true
    // } catch (err) {
    //   return false
    // }
  }

  generateAccountFromMnemonic(mnemonic: string, index: number): Account<N> {
    const bip44Path = this.bip44DerivationPath.replace('?', index.toString())

    const seed = bip39.mnemonicToEntropy(mnemonic)
    const seedBytes = Uint8Array.from(Buffer.from(seed, 'hex'))

    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(seedBytes, new Uint8Array())

    const { purpose, coinType, account, addressIndex } = BSUtilsHelper.parseBip44Path(bip44Path)

    const accountKey = rootKey.derive(purpose).derive(coinType).derive(account)

    const paymentKey = accountKey.derive(0).derive(addressIndex).to_raw_key()
    const stakeKey = accountKey.derive(2).derive(addressIndex).to_raw_key()

    const address = CardanoWasm.BaseAddress.new(
      this.network.type === 'mainnet' ? 1 : 0,
      CardanoWasm.Credential.from_keyhash(paymentKey.to_public().hash()),
      CardanoWasm.Credential.from_keyhash(stakeKey.to_public().hash())
    )
      .to_address()
      .to_bech32()

    return {
      address,
      key: paymentKey.to_bech32(),
      blockchain: this.name,
      type: 'privateKey',
      bip44Path,
    }
  }

  generateAccountFromKey(key: string): Account<N> {
    const paymentKey = CardanoWasm.PrivateKey.from_bech32(key)
  }

  transfer(param: TransferParam<N>): Promise<string[]> {
    throw new Error('Method not implemented.')
  }
}
