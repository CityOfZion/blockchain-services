import {
  IBlockchainService,
  IBSWithExplorer,
  IBSWithFee,
  IBSWithLedger,
  IBSWithNameService,
  IBSWithNft,
  TNetworkId,
} from '@cityofzion/blockchain-service'

export type TBSSolanaNetworkId = TNetworkId<'mainnet-beta' | 'devnet'>

export interface IBSSolana<N extends string = string>
  extends IBlockchainService<N, TBSSolanaNetworkId>,
    IBSWithFee<N>,
    IBSWithNameService,
    IBSWithLedger<N>,
    IBSWithNft,
    IBSWithExplorer {}
