import {
  TBSAccount,
  TBalanceResponse,
  IBlockchainService,
  IBSWithClaim,
  IBSWithEncryption,
  IBSWithExplorer,
  IBSWithLedger,
  TBSNetworkId,
} from '@cityofzion/blockchain-service'

export type TBSNeoLegacyNetworkId = TBSNetworkId<'mainnet' | 'testnet'>

export type TSigningCallback = (transaction: string, publicKey: string) => Promise<string | string[]>

export interface IBSNeoLegacy<N extends string = string>
  extends IBlockchainService<N, TBSNeoLegacyNetworkId>,
    IBSWithClaim<N>,
    IBSWithExplorer,
    IBSWithLedger<N>,
    IBSWithEncryption<N> {
  generateSigningCallback(account: TBSAccount<N>): Promise<{ neonJsAccount: any; signingCallback: TSigningCallback }>
  sendTransfer(config: any, nep5ScriptBuilder?: any): Promise<string>
}

export type TNeo3NeoLegacyWaitForMigrationParams = {
  transactionHash: string
  neo3Address: string
  neo3Service: IBlockchainService
  neoLegacyService: IBlockchainService
}

export type TNeo3NeoLegacyMigrateParams<N extends string = string> = {
  account: TBSAccount<N>
  neo3Address: string
  neoLegacyMigrationAmounts: TNeo3NeoLegacyMigrationNeoLegacyAmounts
}

export type TNeo3NeoLegacyMigrationNeo3Amounts = {
  gasMigrationTotalFees?: string
  neoMigrationTotalFees?: string
  gasMigrationReceiveAmount?: string
  neoMigrationReceiveAmount?: string
}

export type TNeo3NeoLegacyMigrationNeoLegacyAmounts = {
  hasEnoughGasBalance: boolean
  hasEnoughNeoBalance: boolean
  gasBalance?: TBalanceResponse
  neoBalance?: TBalanceResponse
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
