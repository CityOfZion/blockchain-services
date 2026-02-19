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
import { TypedDataSigner } from '@ethersproject/abstract-signer'
import { ethers } from 'ethers'

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

export type TSupportedEVM = 'ethereum' | 'polygon' | 'base' | 'arbitrum'

export interface IBSEthereum<N extends string = string, A extends string = TBSEthereumNetworkId>
  extends IBlockchainService<N, A>,
    IBSWithNameService,
    IBSWithNft,
    IBSWithFee<N>,
    IBSWithLedger<N>,
    IBSWithExplorer,
    IBSWithEncryption<N>,
    IBSWithWalletConnect<N>,
    IBSWithFullTransactions<N> {
  generateSigner(account: TBSAccount<N>): Promise<ethers.Signer & TypedDataSigner>
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
