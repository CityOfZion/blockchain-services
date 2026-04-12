import type {
  IBlockchainService,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNft,
  IBSWithWalletConnect,
  TBSAccount,
  TBSNetworkId,
} from '@cityofzion/blockchain-service'
import type {
  SolanaRpcApi,
  Rpc,
  Transaction,
  Base64EncodedWireTransaction,
  TransactionForFullJsonParsed,
} from '@solana/kit'

export type TBSSolanaNetworkId = TBSNetworkId<'mainnet-beta' | 'devnet'>

export type TBSSolanaName = 'solana'

export interface IBSSolana
  extends
    IBlockchainService<TBSSolanaName, TBSSolanaNetworkId>,
    IBSWithFee<TBSSolanaName>,
    IBSWithNameService,
    IBSWithLedger<TBSSolanaName>,
    IBSWithNft,
    IBSWithExplorer,
    IBSWithWalletConnect<TBSSolanaName> {
  _solanaKitRpc: Rpc<SolanaRpcApi>

  _signTransaction(
    transaction: Transaction,
    senderAccount: TBSAccount<TBSSolanaName>
  ): Promise<Base64EncodedWireTransaction>
}

export type TMetaplexAssetByOwnerResponse = {
  jsonrpc: string
  id: string
  result: {
    cursor?: string
    items: TMetaplexAssetResponse['result'][]
  }
}

export type TMetaplexAssetResponse = {
  jsonrpc: string
  result: {
    interface: string
    id: string
    content: {
      $schema: string
      json_uri: string
      files: {
        uri: string
        mime: string
      }[]
      metadata: {
        attributes: {
          trait_type: string
          value: number | string
        }[]
        description: string
        name: string
        symbol: string
        token_standard: string
      }
    }
    grouping: {
      group_key: string
      group_value: string
      verified: boolean
      collection_metadata?: {
        description: string
        image: string
        name: string
        symbol: string
      }
    }[]
    creators: {
      address: string
      share: number
      verified: boolean
    }[]
    ownership: {
      frozen: boolean
      delegated: boolean
      delegate: null
      ownership_model: string
      owner: string
    }
    supply: null
    mutable: boolean
    burnt: boolean
    lamports: number
    executable: boolean
    metadata_owner: string
    rent_epoch: number
    token_info: {
      supply: number
      decimals: number
      token_program: string
      mint_authority: string
      freeze_authority: string
      balance: number
      associated_token_address: string
    }
  }
  id: string
}

export type TRpcBDSSolanaParsedInstruction = Extract<
  TransactionForFullJsonParsed<'legacy'>['transaction']['message']['instructions'][number],
  { parsed: any }
>

export type TWalletConnectServiceSolanaMethod =
  | 'solana_getAccounts'
  | 'solana_requestAccounts'
  | 'solana_signMessage'
  | 'solana_signTransaction'
  | 'solana_signAllTransactions'
  | 'solana_signAndSendTransaction'
