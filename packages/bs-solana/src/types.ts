import {
  IBlockchainService,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNft,
  TBSNetworkId,
} from '@cityofzion/blockchain-service'

export type TBSSolanaNetworkId = TBSNetworkId<'mainnet-beta' | 'devnet'>

export interface IBSSolana<N extends string = string>
  extends IBlockchainService<N, TBSSolanaNetworkId>,
    IBSWithFee<N>,
    IBSWithNameService,
    IBSWithLedger<N>,
    IBSWithNft,
    IBSWithExplorer {}
