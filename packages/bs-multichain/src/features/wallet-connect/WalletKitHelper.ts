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
  TWalletKitHelperFilterSessionsParams,
  TWalletKitHelperGetProposalDetailsParams,
  TWalletKitHelperGetSessionDetailsParams,
  TWalletKitHelperProcessRequestParams,
  TWalletKitHelperProposalDetails,
  TWalletKitHelperSessionDetails,
} from './types'

export class WalletKitHelper {
  static getProposalDetails<N extends string>({
    address,
    proposal,
    services,
  }: TWalletKitHelperGetProposalDetailsParams<N>): TWalletKitHelperProposalDetails<N> {
    const mergedNamespacesObject = mergeRequiredAndOptionalNamespaces(
      proposal.requiredNamespaces,
      proposal.optionalNamespaces
    )
    const allChains = new Set(getChainsFromRequiredNamespaces(mergedNamespacesObject))

    const service = services.find(
      (service): service is IBlockchainService<N> & IBSWithWalletConnect =>
        hasWalletConnect(service) && allChains.has(service.walletConnectService.chain)
    )
    if (!service) throw new BSError('Requested chain(s) not supported by any service', 'NO_SERVICE')

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

  static getSessionDetails<N extends string>({
    session,
    services,
  }: TWalletKitHelperGetSessionDetailsParams<N>): TWalletKitHelperSessionDetails<N> {
    const sessionAccounts = getAccountsFromNamespaces(session.namespaces)
    const [sessionAddress] = getAddressesFromAccounts(sessionAccounts)
    if (!sessionAddress) throw new BSError('No accounts found in session', 'NO_ACCOUNTS')

    const chains = getChainsFromNamespaces(session.namespaces)

    const service = services.find(
      (service): service is IBlockchainService<N> & IBSWithWalletConnect =>
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
      | TWalletConnectServiceRequestMethod
      | undefined

    if (!serviceMethod || typeof serviceMethod !== 'function')
      throw new BSError('Method not supported', 'UNSUPPORTED_METHOD')

    const response = await serviceMethod.apply(sessionDetails.service.walletConnectService, [
      { account, params: request.params.request.params },
    ])

    return response
  }

  static filterSessions(sessions: SessionTypes.Struct[], filters: TWalletKitHelperFilterSessionsParams) {
    let filteredSessions = sessions

    if (filters?.addresses) {
      filteredSessions = filteredSessions.filter(session => {
        let matched = false

        if (filters.addresses) {
          const sessionAccounts = getAccountsFromNamespaces(session.namespaces)
          const [address] = getAddressesFromAccounts(sessionAccounts)
          if (address && filters.addresses.includes(address)) {
            matched = true
          }
        }

        if (filters.chains && !matched) {
          const chains = getChainsFromNamespaces(session.namespaces)
          if (chains.some(namespace => filters.chains?.includes(namespace))) {
            matched = true
          }
        }

        return matched
      })
    }

    return filteredSessions
  }

  static isValidURI(uri: string) {
    return /^wc:.+@\d.*$/g.test(uri)
  }
}
