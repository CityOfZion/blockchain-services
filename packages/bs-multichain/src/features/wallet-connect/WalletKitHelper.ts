import {
  BSError,
  hasWalletConnect,
  IBlockchainService,
  IBSWithWalletConnect,
  TWalletConnectServiceRequestMethod,
} from '@cityofzion/blockchain-service'
import { ErrorResponse, formatJsonRpcError, formatJsonRpcResult } from '@walletconnect/jsonrpc-utils'
import type { PendingRequestTypes, SessionTypes } from '@walletconnect/types'
import {
  buildApprovedNamespaces,
  getAccountsFromNamespaces,
  getAddressesFromAccounts,
  getChainsFromNamespaces,
  getChainsFromRequiredNamespaces,
  getNamespacesMethodsForChainId,
  getSdkError,
  mergeRequiredAndOptionalNamespaces,
  SdkErrorKey,
} from '@walletconnect/utils'
import {
  type TWalletKitHelperFilterSessionsParams,
  type TWalletKitHelperGetProposalDetailsParams,
  type TWalletKitHelperGetSessionDetailsParams,
  type TWalletKitHelperProcessRequestParams,
  type TWalletKitHelperProposalDetails,
  type TWalletKitHelperSessionDetails,
  type TWalletKitHelperGetProposalServicesParams,
} from './types'

export class WalletKitHelper {
  static getProposalDetails<N extends string>({
    address,
    proposal,
    service,
  }: TWalletKitHelperGetProposalDetailsParams<N>): TWalletKitHelperProposalDetails<N> {
    const mergedNamespacesObject = mergeRequiredAndOptionalNamespaces(
      proposal?.requiredNamespaces ?? {},
      proposal?.optionalNamespaces ?? {}
    )
    const allChains = new Set(getChainsFromRequiredNamespaces(mergedNamespacesObject))

    if (!hasWalletConnect(service) || !allChains.has(service.walletConnectService.chain))
      throw new BSError('Requested chain(s) not supported by any service', 'NO_SERVICE')

    const namespaceObject = mergedNamespacesObject[service.walletConnectService.namespace]
    if (!namespaceObject) throw new BSError('Requested namespace not supported by any service', 'NO_SERVICE')

    const approvedNamespaces = buildApprovedNamespaces({
      proposal: proposal,
      supportedNamespaces: {
        [service.walletConnectService.namespace]: {
          chains: [service.walletConnectService.chain],
          methods: service.walletConnectService.supportedMethods,
          events: service.walletConnectService.supportedEvents,
          accounts: [`${service.walletConnectService.chain}:${address}`],
        },
      },
    })

    const methods = namespaceObject.methods

    return { approvedNamespaces, methods, service, blockchain: service.name }
  }

  static getProposalServices<N extends string>({ proposal, services }: TWalletKitHelperGetProposalServicesParams<N>) {
    const mergedNamespacesObject = mergeRequiredAndOptionalNamespaces(
      proposal?.requiredNamespaces ?? {},
      proposal?.optionalNamespaces ?? {}
    )
    const allChains = new Set(getChainsFromRequiredNamespaces(mergedNamespacesObject))

    const proposalServices = services.filter(
      (service): service is IBlockchainService<N> & IBSWithWalletConnect<N> =>
        hasWalletConnect(service) && allChains.has(service.walletConnectService.chain)
    )

    return proposalServices
  }

  static getSessionDetails<N extends string>({
    session,
    services,
  }: TWalletKitHelperGetSessionDetailsParams<N>): TWalletKitHelperSessionDetails<N> {
    const sessionAccounts = getAccountsFromNamespaces(session.namespaces)
    const [sessionAddress] = getAddressesFromAccounts(sessionAccounts)
    if (!sessionAddress) throw new BSError('No accounts found in session', 'NO_ACCOUNTS')

    const chains = getChainsFromNamespaces(session.namespaces)

    const service = services.find(
      (service): service is IBlockchainService<N> & IBSWithWalletConnect<N> =>
        hasWalletConnect(service) && chains.includes(service.walletConnectService.chain)
    )
    if (!service) throw new BSError('Requested chain not supported by any service', 'NO_SERVICE')

    const methods = getNamespacesMethodsForChainId(session.namespaces, service.walletConnectService.chain)

    return { service, address: sessionAddress, methods, blockchain: service.name }
  }

  static getError(key: SdkErrorKey) {
    return getSdkError(key)
  }

  static formatRequestResult(request: PendingRequestTypes.Struct, response: any) {
    return formatJsonRpcResult(request.id, response)
  }

  static formatRequestError(request: PendingRequestTypes.Struct, reason: ErrorResponse) {
    return formatJsonRpcError(request.id, reason ?? getSdkError('USER_REJECTED'))
  }

  static async processRequest<N extends string>({
    sessionDetails,
    account,
    request,
  }: TWalletKitHelperProcessRequestParams<N>) {
    if (account.address !== sessionDetails.address) {
      throw new BSError('Account address does not match session address', 'INVALID_ACCOUNT')
    }

    const method = request.params.request.method

    if (!sessionDetails.methods.includes(method)) {
      throw new BSError('Method not supported by session', 'UNSUPPORTED_METHOD')
    }

    const serviceMethod = sessionDetails.service.walletConnectService[method] as
      | TWalletConnectServiceRequestMethod<N>
      | undefined

    if (!serviceMethod || typeof serviceMethod !== 'function')
      throw new BSError('Method not supported', 'UNSUPPORTED_METHOD')

    const response = await serviceMethod.apply(sessionDetails.service.walletConnectService, [
      { account, params: request.params.request.params },
    ])

    return response
  }

  static filterSessions(sessions: SessionTypes.Struct[], filters: TWalletKitHelperFilterSessionsParams) {
    const filteredSessions = sessions.filter(session => {
      let addressMatched = !filters.addresses
      let chainMatched = !filters.chains

      if (filters.addresses) {
        const sessionAccounts = getAccountsFromNamespaces(session.namespaces)
        const [address] = getAddressesFromAccounts(sessionAccounts)
        if (address && filters.addresses.includes(address)) {
          addressMatched = true
        }
      }

      if (filters.chains) {
        const chains = getChainsFromNamespaces(session.namespaces)
        if (chains.some(chain => filters.chains?.includes(chain))) {
          chainMatched = true
        }
      }

      return addressMatched && chainMatched
    })

    return filteredSessions
  }

  static isValidURI(uri: string) {
    return /^wc:.+@\d.*$/g.test(uri)
  }
}
