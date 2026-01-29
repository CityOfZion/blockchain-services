import { IBlockchainService, IBSWithWalletConnect, TBSAccount } from '@cityofzion/blockchain-service'
import { PendingRequestTypes, ProposalTypes, SessionTypes } from '@walletconnect/types'

export type TWalletKitHelperGetProposalDetailsParams<N extends string = string> = {
  proposal: ProposalTypes.Struct
  address: string
  service: IBlockchainService<N>
}

export type TWalletKitHelperGetProposalServicesParams<N extends string = string> = {
  proposal: ProposalTypes.Struct
  services: IBlockchainService<N>[]
}

export type TWalletKitHelperProposalDetails<N extends string = string> = {
  methods: string[]
  approvedNamespaces: SessionTypes.Namespaces
  service: IBlockchainService<N> & IBSWithWalletConnect<N>
  blockchain: N
}

export type TWalletKitHelperGetSessionDetailsParams<N extends string = string> = {
  session: SessionTypes.Struct
  services: IBlockchainService<N>[]
}

export type TWalletKitHelperSessionDetails<N extends string = string> = {
  address: string
  methods: string[]
  service: IBlockchainService<N> & IBSWithWalletConnect<N>
  blockchain: N
}

export type TWalletKitHelperProcessRequestParams<N extends string = string> = {
  request: PendingRequestTypes.Struct
  sessionDetails: TWalletKitHelperSessionDetails<N>
  account: TBSAccount<N>
}

export type TWalletKitHelperFilterSessionsParams = { addresses?: string[]; chains?: string[] }
