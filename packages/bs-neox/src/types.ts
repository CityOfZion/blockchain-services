import type { IBSWithNeo3NeoXBridge, TBSNetworkId } from '@cityofzion/blockchain-service'
import { ERC20_ABI, IBSEthereum } from '@cityofzion/bs-ethereum'
import { ethers, Signer } from 'ethers'
import type { Neo3NeoXBridgeService } from './services/neo3-neox-bridge/Neo3NeoXBridgeService'

export type TBSNeoXNetworkId = TBSNetworkId<'47763' | '12227332'>

export type TBSNeoXName = 'neox'

export interface IBSNeoX extends IBSEthereum<TBSNeoXName, TBSNeoXNetworkId>, IBSWithNeo3NeoXBridge<TBSNeoXName> {
  neo3NeoXBridgeService: Neo3NeoXBridgeService
  _sendTransaction(params: TSendTransactionParams): Promise<TSendTransactionResponse>
}

export type TBlockscoutBDSNeoXTransactionApiResponse = {
  fee: {
    value: string
  }
  hash: string
  block: number
  timestamp: string
  value: string
  from: {
    hash: string
  }
  to: {
    hash: string
  }
  token_transfers: {
    token: {
      type: string
      address: string
      symbol: string
      name: string
    }
    from: {
      hash: string
    }
    to: {
      hash: string
    }
    total: {
      value: string
      decimals: number
      token_id: string
    }
  }[]
  raw_input: string
}

export type TBlockscoutBDSNeoXTransactionByAddressApiResponse = {
  items: TBlockscoutBDSNeoXTransactionApiResponse[]
  next_page_params?: {
    block_number: number
    fee: string
    hash: string
    index: number
    inserted_at: string
    items_count: number
    value: string
  } | null
}

export type TBlockscoutBDSNeoXBlocksApiResponse = {
  items: {
    height: number
  }[]
}

export type TBlockscoutBDSNeoXBalanceApiResponse = {
  token: {
    name: string
    decimals: string | null
    address: string
    symbol: string
    type: string
  }
  token_id: string | null
  value: string
}

export type TBlockscoutBDSNeoXSmartContractApiResponse = {
  name: string
  abi: typeof ERC20_ABI
}

export type TBlockscoutBDSNeoXTokensApiResponse = {
  name: string
  decimals: string | null
  address: string
  symbol: string
  type: string
}

export type TNeo3NeoXBridgeServiceTransactionLogApiResponse = { items: { data: string; topics: any[] }[] }
export type TNeo3NeoXBridgeServiceGetTransactionByNonceApiReponse = { txid: string | null }

export type TSendTransactionParams = {
  signer: Signer
  gasPrice: ethers.BigNumber
  params: ethers.utils.Deferrable<ethers.providers.TransactionRequest>
}

export type TSendTransactionResponse = {
  transactionHash: string
  fee: string
}
