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
  IBSWithFullTransactions,
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
    IBSWithLedger<N>,
    IBSWithFullTransactions<N>,
    IBSWithWalletConnect<N> {}

export type TOrdinalsContentResponse = {
  p: string
  op: string
  tick: string
  max: string
  lim: string
}

export type THiroTokenResponse = {
  token: {
    id: string
    number: number
    block_height: number
    tx_id: string
    address: string
    ticker: string
    max_supply: string
    mint_limit: string
    decimals: number
    deploy_timestamp: number
    minted_supply: string
    tx_count: number
    self_mint: boolean
  }
  supply: {
    max_supply: string
    minted_supply: string
    holders: number
  }
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

export type THiroBalancesResponse = {
  limit: number
  offset: number
  total: number
  results: {
    ticker: string
    available_balance: string
    transferrable_balance: string
    overall_balance: string
  }[]
}

export type THiroInscriptionResponse = {
  id: string
  number: number
  address: string
  genesis_address: string
  genesis_block_height: number
  genesis_block_hash: string
  genesis_tx_id: string
  genesis_fee: string
  genesis_timestamp: number
  tx_id: string
  location: string
  output: string
  value: string
  offset: string
  sat_ordinal: string
  sat_rarity: string
  sat_coinbase_height: number
  mime_type: string
  content_type: string
  content_length: number
  timestamp: number
  curse_type: string
  recursive: boolean
  recursion_refs: string[]
  parent: any
  parent_refs: []
  delegate: any
  metadata: any
  meta_protocol: any
  charms: string[]
}

export type THiroInscriptionsResponse = {
  limit: number
  offset: number
  total: number
  results: THiroInscriptionResponse[]
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

export type TGetTransferDataParams<N extends string> = TTransferParams<N> & { canValidate?: boolean }

export type TGetTransferDataResponse = {
  utxos: TTatumUtxo[]
  fee: TBSBigNumber
  change: TBSBigNumber
}
