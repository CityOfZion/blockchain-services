import type {
  TBSAccount,
  IBlockchainService,
  IBSWithClaim,
  IBSWithEncryption,
  IBSWithExplorer,
  IBSWithLedger,
  TBSNetworkId,
  IBSWithFullTransactions,
} from '@cityofzion/blockchain-service'

export type TBSNeoLegacyNetworkId = TBSNetworkId<'mainnet' | 'testnet'>

export type TBSNeoLegacyName = 'neoLegacy'

export type TSigningCallback = (transaction: string, publicKey: string) => Promise<string | string[]>

export interface IBSNeoLegacy
  extends
    IBlockchainService<TBSNeoLegacyName, TBSNeoLegacyNetworkId>,
    IBSWithClaim<TBSNeoLegacyName>,
    IBSWithExplorer,
    IBSWithLedger<TBSNeoLegacyName>,
    IBSWithEncryption<TBSNeoLegacyName>,
    IBSWithFullTransactions {
  _generateSigningCallback(
    account: TBSAccount<TBSNeoLegacyName>
  ): Promise<{ neonJsAccount: any; signingCallback: TSigningCallback }>
  _legacyNetwork: string
  _hasTransactionMoreThanMaxSize(config: any): boolean
  _getRequiredTransactionFeeConfig(config: any): any
  _sendTransfer(config: any, nep5ScriptBuilder?: any): Promise<string>
}

export enum ENeonJsLedgerServiceNeoLegacyStatus {
  OK = 0x9000,
}

export enum ENeonJsLedgerServiceNeoLegacyCommand {
  GET_PUBLIC_KEY = 0x04,
  SIGN = 0x02,
}

export enum ENeonJsLedgerServiceNeoLegacyParameter {
  MORE_DATA = 0x00,
  LAST_DATA = 0x80,
}
