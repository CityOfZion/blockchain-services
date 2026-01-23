import {
  TBSAccount,
  IBlockchainService,
  IBSWithClaim,
  IBSWithEncryption,
  IBSWithExplorer,
  IBSWithLedger,
  TBSNetworkId,
  type IBSWithFullTransactions,
} from '@cityofzion/blockchain-service'

export type TBSNeoLegacyNetworkId = TBSNetworkId<'mainnet' | 'testnet'>

export type TSigningCallback = (transaction: string, publicKey: string) => Promise<string | string[]>

export interface IBSNeoLegacy<N extends string = string>
  extends IBlockchainService<N, TBSNeoLegacyNetworkId>,
    IBSWithClaim<N>,
    IBSWithExplorer,
    IBSWithLedger<N>,
    IBSWithEncryption<N>,
    IBSWithFullTransactions {
  generateSigningCallback(account: TBSAccount<N>): Promise<{ neonJsAccount: any; signingCallback: TSigningCallback }>
  sendTransfer(config: any, nep5ScriptBuilder?: any): Promise<string>
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
