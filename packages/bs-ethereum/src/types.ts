import type {
  IBlockchainService,
  IBSWithEncryption,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNft,
  IBSWithWalletConnect,
  TBSAccount,
  TBSNetworkId,
  IBSWithFullTransactions,
} from '@cityofzion/blockchain-service'
import { type Signer } from 'ethers'

export type TBSEthereumNetworkId = TBSNetworkId<
  | '1'
  | '10'
  | '25'
  | '56'
  | '137'
  | '250'
  | '1101'
  | '8453'
  | '80002'
  | '42161'
  | '42220'
  | '43114'
  | '59144'
  | '11155111'
>

export type TBSEthereumName = 'ethereum' | 'polygon' | 'base' | 'arbitrum'

export interface IBSEthereum<N extends string = TBSEthereumName, A extends TBSNetworkId = TBSEthereumNetworkId>
  extends
    IBlockchainService<N, A>,
    IBSWithNameService,
    IBSWithNft,
    IBSWithFee<N>,
    IBSWithLedger<N>,
    IBSWithExplorer,
    IBSWithEncryption<N>,
    IBSWithWalletConnect<N>,
    IBSWithFullTransactions<N> {
  _getSigner(account: TBSAccount<N>): Promise<Signer>
}

export type TMoralisBDSEthereumNativeBalanceApiResponse = {
  balance: string
}

export type TMoralisBDSEthereumERC20BalanceApiResponse = {
  token_address: string
  name: string
  symbol: string
  decimals: number
  balance: string
  possible_spam: boolean
}

export type TMoralisBDSEthereumERC20MetadataApiResponse = {
  name: string
  symbol: string
  decimals: string
}

export type TMoralisBDSEthereumTransactionApiResponse = {
  from_address: string
  to_address: string
  value: string
  transaction_fee: string
  block_timestamp: string
  block_number: string
  logs: {
    address: string
    decoded_event: {
      label: string
      params: {
        name: string
        value: string
        type: string
      }[]
    }
  }[]
}

export type TMoralisWalletHistoryApiResponse = {
  cursor?: string
  result: {
    hash: string
    transaction_fee: string
    block_timestamp: string
    block_number: string
    nft_transfers: {
      token_address: string
      token_id: string
      from_address: string
      to_address: string
      possible_spam: boolean
    }[]
    erc20_transfers: {
      token_name: string
      token_symbol: string
      token_decimals: string
      address: string
      to_address: string
      from_address: string
      value: string
      possible_spam: boolean
      verified_contract: boolean
    }[]
    native_transfers: {
      from_address: string
      to_address: string
      value: string
    }[]
  }[]
}

export type TMoralisTokenMetadataApiResponse = {
  name: string
}

export type TMoralisEDSEthereumERC20PriceApiResponse = {
  tokenName: string
  tokenSymbol: string
  tokenDecimals: string
  usdPrice: number
  tokenAddress: string
  blockTimestamp: string
}

type TMoralisNDSEthereumNftBaseApiResponse = {
  token_address: string
  token_id: string
  contract_type: string
  name: string
  symbol: string
  possible_spam: boolean
  token_uri?: string
  metadata?: string
  normalized_metadata?: {
    name?: string
    description?: string
    image?: string
    external_link?: string
    external_url?: string
    animation_url?: string
    attributes?: {
      trait_type: string
      value: string
      display_type?: string
      max_value?: number
      trait_count?: number
      order?: number
    }[]
  }
  media?: {
    mimetype?: string
    category?: string
    status?: string
    original_media_url?: string
    updatedAt?: string
    parent_hash?: string
    media_collection?: {
      low: { width: number; height: number; url: string }
      medium: { width: number; height: number; url: string }
      high: { width: number; height: number; url: string }
    }
  }
  amount?: string
  rarity_rank?: number
  rarity_percentage?: number
  rarity_label?: string
  verified_collection?: boolean
  floor_price?: string
  floor_price_usd?: string
  floor_price_currency?: string
}

export type TMoralisNDSEthereumNftMetadataApiResponse = TMoralisNDSEthereumNftBaseApiResponse & {
  owner_of?: string
  token_hash?: string
  block_number?: string
  block_number_minted?: string
  minter_address?: string
  last_token_uri_sync?: string
  last_metadata_sync?: string
  list_price?: {
    listed?: boolean
    price?: string
    price_currency?: string
    price_usd?: string
    marketplace?: string
  }
}

export type TMoralisNDSEthereumNftApiResponse = TMoralisNDSEthereumNftBaseApiResponse & {
  owner_of: string
  block_number: string
  block_number_minted: string
  token_hash: string
  last_token_uri_sync: string
  last_metadata_sync: string
}

export type TMoralisNDSEthereumNftsByAddressApiResponse = {
  result: TMoralisNDSEthereumNftApiResponse[]
  cursor?: string
  status?: string
  page?: number
  page_size?: number
}
export type TWalletConnectServiceEthereumMethod =
  | 'personal_sign'
  | 'eth_sign'
  | 'eth_signTransaction'
  | 'eth_signTypedData'
  | 'eth_signTypedData_v3'
  | 'eth_signTypedData_v4'
  | 'eth_sendTransaction'
  | 'eth_getNonce'
  | 'eth_call'
  | 'eth_requestAccounts'
  | 'eth_sendRawTransaction'
  | 'eth_addEthereumChain'
  | 'eth_switchEthereumChain'
  | 'wallet_switchEthereumChain'
  | 'wallet_getPermissions'
  | 'wallet_requestPermissions'
  | 'wallet_addEthereumChain'
  | (string & {})
