import type {
  IBlockchainService,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNft,
  TBSNetworkId,
  IBSWithEncryption,
  TBSBigNumber,
  TTransferParams,
} from '@cityofzion/blockchain-service'
import { AxiosInstance } from 'axios'

export type TBSBitcoinNetworkId = TBSNetworkId<'mainnet' | 'testnet'>

export interface IBSBitcoin<N extends string = string, A extends string = TBSBitcoinNetworkId>
  extends IBlockchainService<N, A>,
    IBSWithNameService,
    IBSWithFee<N>,
    IBSWithExplorer,
    IBSWithEncryption<N>,
    IBSWithNft,
    IBSWithLedger<N> {}

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
  inputs: [
    {
      prevout: {
        hash: string
        index: number
      }
      sequence: number
      script: string
      coin: {
        version: number
        height: number
        value: number
        script: string
        address: string
        type: string
        reqSigs: number | null
        coinbase: boolean
      }
    },
  ]
  locktime: number
  outputs: [
    {
      value: number
      script: string
      address: string
      scriptPubKey: {
        type: string
        reqSigs: number | null
      }
    },
  ]
}

export type TTatumBalanceResponse = {
  incoming: string
  outgoing: string
  incomingPending: string
  outgoingPending: string
}

export type TTatumBlockchainInfoResponse = {
  chain: string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
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
}

export type TTatumApis = {
  v3: AxiosInstance
  v4: AxiosInstance
}

export type TGetTransferDataParams<N extends string> = TTransferParams<N> & { shouldValidate?: boolean }

export type TGetTransferDataResponse = {
  utxos: TTatumUtxo[]
  fee: TBSBigNumber
  change: TBSBigNumber
}
