import type {
  IBlockchainService,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNft,
  TBSNetworkId,
  IBSWithEncryption,
  IBSWithWalletConnect,
  TBSBigNumber,
  TTransferParams,
  TBSAccount,
} from '@cityofzion/blockchain-service'
import { TatumBDSBitcoin } from './services/blockchain-data/TatumBDSBitcoin'
import { LedgerServiceBitcoin } from './services/ledger/LedgerServiceBitcoin'
import type { ECPairInterface } from 'ecpair'
import type Transport from '@ledgerhq/hw-transport'
import * as bitcoinjs from 'bitcoinjs-lib'

export type TBSBitcoinNetworkId = TBSNetworkId<'mainnet' | 'testnet'>

export type TBSBitcoinName = 'bitcoin'

export interface IBSBitcoin
  extends
    IBlockchainService<TBSBitcoinName, TBSBitcoinNetworkId>,
    IBSWithNameService,
    IBSWithFee<TBSBitcoinName>,
    IBSWithExplorer,
    IBSWithEncryption<TBSBitcoinName>,
    IBSWithNft,
    IBSWithLedger<TBSBitcoinName>,
    IBSWithWalletConnect<TBSBitcoinName> {
  blockchainDataService: TatumBDSBitcoin
  ledgerService: LedgerServiceBitcoin
  _bitcoinjsNetwork: bitcoinjs.Network

  _isP2WPKHAddress(address: string): boolean
  _isP2SHAddress(address: string): boolean
  _isP2PKHAddress(address: string): boolean
  _getKeyPair(key: string): ECPairInterface
  _getLedgerTransport(account: TBSAccount<TBSBitcoinName>): Promise<Transport>
  _signTransaction(params: TSignTransactionParams): Promise<void>
  _broadcastTransaction(transactionHex: string): Promise<string>
}

export type TOrdinalsContentResponse = {
  p: string
  op: string
  tick: string
  max: string
  lim: string
}

export type THiroNameResponse = {
  address: string
  blockchain: string
  last_txid: string
  status: string
  zonefile_hash: string
  expire_block: number
  zonefile: string
}

export type TXverseTokenResponse = {
  ticker: string
  maxSupply: string
  mintLimit: string
  decimals: number
  txid: string
  inscriptionId: string
  blockHeight: string
  isSelfMint: true
  prices: {
    floorPrice: {
      marketplace: string
      valueInSats: string
      valueInUsd: string
      percentageChange24h: {
        valueInSats: string
        valueInUsd: string
      }
    }
    lastSalePrice: {
      marketplace: string
      valueInSats: string
      valueInUsd: string
    }
  }
  volume24h: {
    valueInSats: string
    valueInUsd: string
    percentageChange: {
      valueInSats: string
      valueInUsd: string
    }
  }
}

export type TXverseBalancesResponse = {
  limit: number
  offset: number
  total: number
  items: {
    ticker: string
    overallBalance: string
    transferableBalance: string
    availableBalance: string
    prices: {
      floorPrice: {
        marketplace: string
        percentageChange24h: {
          valueInSats: string
          valueInUsd: string
        }
        valueInSats: string
        valueInUsd: string
      }
      lastSalePrice: {
        marketplace: string
        valueInSats: string
        valueInUsd: string
      }
    }
    volume24h: {
      percentageChange: {
        valueInSats: string
        valueInUsd: string
      }
      valueInSats: string
      valueInUsd: string
    }
  }[]
}

export type TXverseInscriptionResponse = {
  id: string
  offset: number
  parentIds: string[]
  delegateId: string
  blockHeight: number
  contentType?: string
  contentLength: number
  effectiveContentType?: string
  number: number
  sat: number
  charms: string[]
  currentOutput: string
  currentAddress: string
  lastTransferHeight: number
  lastTransferTimestamp: number
  value: number
  contentUrl: string
  renderUrl: string
  collectionId?: string
  collectionName?: string
  collectionSymbol?: string
  collectionFloorPrice: {
    valueInSats: string
    valueInUsd: string
  }
  lastInscriptionSalePrice: {
    valueInSats: string
    valueInUsd: string
  }
  name?: string
  indexerHeight: number
}

export type TXverseInscriptionsResponse = {
  limit: number
  offset: number
  items: TXverseInscriptionResponse[]
}

export type TXverseCollectionInscriptionsResponse = {
  collectionId: string
  collectionName: string
  total: number
  offset: number
  limit: number
  inscriptions: {
    id: string
    number: number
    sat: number
    contentType: string
    blockHeight: number
    charms: string[]
    currentLocation: string
  }[]
}

export type TTatumTransactionResponse = {
  blockNumber: number | null
  fee: number
  hash: string
  hex: string
  size: number
  time: number
  version: number
  vsize: number
  weight: number
  witnessHash: string
  block: string
  index: number
  locktime: number
  inputs: {
    prevout: {
      hash: string
      index: number
    }
    sequence: number
    script: string
    coin?: {
      version: number
      height: number
      value: number
      script: string
      address: string
      type: string
      reqSigs: number | null
      coinbase: boolean
    }
  }[]
  outputs: {
    value: number
    script: string
    address?: string
    scriptPubKey: {
      type: string
      reqSigs: number | null
    }
  }[]
}

export type TTatumBalanceResponse = {
  balance: string
  incoming: string
  outgoing: string
  incomingPending: string
  outgoingPending: string
}

export type TTatumUtxo = {
  chain: string
  address: string
  txHash: string
  index: number
  value: number
  valueAsString: string
}

export type TTatumUtxosResponse = TTatumUtxo[]

export type TTatumFeesResponse = {
  fast: number
  medium: number
  slow: number
  block: number
  time: string
}

export type TTatumBroadcastResponse = {
  txId: string
  completed: boolean
}

export type TGetTransferDataParams = TTransferParams<TBSBitcoinName> & { shouldValidate?: boolean }

export type TGetTransferDataResponse = {
  utxos: TTatumUtxo[]
  fee: TBSBigNumber
  change: TBSBigNumber
}

export type TSignInput = {
  index: number
  address: string
  sighashTypes?: number[]
}

export type TSignTransactionParams = {
  psbt: bitcoinjs.Psbt
  account: TBSAccount<TBSBitcoinName>
  signInputs?: TSignInput[]
}

export type TWalletConnectServiceBitcoinTransformSendTransferParamsResponse = {
  recipientAddress: string
  amount: string
}

export type TWalletConnectServiceBitcoinGetAccountAddressResponse = {
  address: string
  publicKey?: string
  path?: string
  intention?: 'payment' | 'ordinal'
}[]

export type TWalletConnectServiceBitcoinSignPsbtResponse = {
  psbt: string
  txid?: string
}

export type TWalletConnectServiceBitcoinSignMessageResponse = {
  address: string
  signature: string
  messageHash: string
}

export type TWalletConnectServiceBitcoinSendTransferResponse = {
  txid: string
}

export type TLedgerServiceBitcoinSignTransactionParams = {
  psbt: bitcoinjs.Psbt
  account: TBSAccount<TBSBitcoinName>
  transport: Transport
  signInputs?: TSignInput[]
}

export type TLedgerServiceBitcoinSignMessageParams = {
  message: string
  account: TBSAccount<TBSBitcoinName>
  transport: Transport
}

export type TLedgerServiceBitcoinSignMessageResponse = {
  signature: string
  messageHash: string
}

export type TLedgerServiceBitcoinGetTransactionHexParams = {
  hash: Uint8Array<ArrayBufferLike>
  nonWitnessUtxo: Parameters<bitcoinjs.Psbt['addInput']>[0]['nonWitnessUtxo']
}
