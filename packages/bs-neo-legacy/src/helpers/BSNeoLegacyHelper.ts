import {
  BlockchainService,
  BSTokenHelper,
  BSUtilsHelper,
  Network,
  TransactionResponse,
} from '@cityofzion/blockchain-service'
import nativeTokens from '../assets/tokens/native.json'
import { BSNeoLegacyConstants, BSNeoLegacyNetworkId } from '../constants/BSNeoLegacyConstants'

export type WaitForMigrationParams = {
  transactionHash: string
  neo3Address: string
  neo3Service: BlockchainService
  neoLegacyService: BlockchainService
}

export class BSNeoLegacyHelper {
  static getLegacyNetwork(network: Network<BSNeoLegacyNetworkId>) {
    const legacyNetwork = BSNeoLegacyConstants.LEGACY_NETWORK_BY_NETWORK_ID[network.id]
    if (!legacyNetwork) throw new Error('Unsupported network')
    return legacyNetwork
  }

  static getTokens(network: Network<BSNeoLegacyNetworkId>) {
    const extraTokens = BSNeoLegacyConstants.EXTRA_TOKENS_BY_NETWORK_ID[network.id] ?? []
    return BSTokenHelper.normalizeToken([...extraTokens, ...nativeTokens])
  }

  static getRpcList(network: Network<BSNeoLegacyNetworkId>) {
    return BSNeoLegacyConstants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSNeoLegacyNetworkId>) {
    return BSNeoLegacyConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }

  static async waitForMigration(params: WaitForMigrationParams) {
    const { neo3Address, neo3Service, transactionHash, neoLegacyService } = params

    const MAX_ATTEMPTS = 10
    const NEO3_MAX_ATTEMPTS = 20

    const response = {
      isTransactionConfirmed: false,
      isNeo3TransactionConfirmed: false,
    }

    let transactionResponse: TransactionResponse

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await BSUtilsHelper.wait(30000)

      try {
        transactionResponse = await neoLegacyService.blockchainDataService.getTransaction(transactionHash)
        response.isTransactionConfirmed = true
        break
      } catch {
        // Empty block
      }
    }

    if (!response.isTransactionConfirmed) return response

    for (let i = 0; i < NEO3_MAX_ATTEMPTS; i++) {
      await BSUtilsHelper.wait(60000)

      try {
        const neo3Response = await neo3Service.blockchainDataService.getTransactionsByAddress({
          address: neo3Address,
        })

        const isTransactionConfirmed = neo3Response.transactions.some(
          transaction =>
            transaction.time > transactionResponse.time &&
            transaction.transfers.some(transfer => transfer.from === BSNeoLegacyConstants.MIGRATION_COZ_NEO3_ADDRESS)
        )

        if (isTransactionConfirmed) {
          response.isNeo3TransactionConfirmed = true
          break
        }
      } catch {
        // Empty block
      }
    }

    return response
  }
}
