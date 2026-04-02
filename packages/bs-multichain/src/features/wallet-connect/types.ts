import type { IBlockchainService, IBSWithWalletConnect, TBSAccount, TBSNetworkId } from '@cityofzion/blockchain-service'
import type { PendingRequestTypes, ProposalTypes, SessionTypes } from '@walletconnect/types'
import type { TBSServiceName } from '../../types'

export type TWalletKitHelperGetProposalDetailsParams = {
  proposal: ProposalTypes.Struct
  address: string
  service: IBlockchainService<TBSServiceName, TBSNetworkId>
}

export type TWalletKitHelperGetProposalServicesParams = {
  proposal: ProposalTypes.Struct
  services: IBlockchainService<TBSServiceName, TBSNetworkId>[]
}

export type TWalletKitHelperProposalDetails = {
  methods: string[]
  approvedNamespaces: SessionTypes.Namespaces
  service: IBlockchainService<TBSServiceName, TBSNetworkId> & IBSWithWalletConnect<TBSServiceName>
  blockchain: TBSServiceName
}

export type TWalletKitHelperGetSessionDetailsParams = {
  session: SessionTypes.Struct
  services: IBlockchainService<TBSServiceName, TBSNetworkId>[]
}

export type TWalletKitHelperSessionDetails = {
  address: string
  methods: string[]
  service: IBlockchainService<TBSServiceName, TBSNetworkId> & IBSWithWalletConnect<TBSServiceName>
  blockchain: TBSServiceName
}

export type TWalletKitHelperProcessRequestParams = {
  request: PendingRequestTypes.Struct
  sessionDetails: TWalletKitHelperSessionDetails
  account: TBSAccount<TBSServiceName>
}

export type TWalletKitHelperValidateRequestParams = {
  request: PendingRequestTypes.Struct
  sessionDetails: TWalletKitHelperSessionDetails
  account: TBSAccount<TBSServiceName>
}

export type TWalletKitHelperFilterSessionsParams = { addresses?: string[]; chains?: string[] }
