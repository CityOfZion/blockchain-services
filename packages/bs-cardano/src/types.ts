import { IBlockchainService, TNetworkId } from '@cityofzion/blockchain-service'

export type TBSCardanoNetworkId = TNetworkId<'mainnet' | 'pre-prod'>

export interface IBSCardano<N extends string = string> extends IBlockchainService<N, TBSCardanoNetworkId> {}
