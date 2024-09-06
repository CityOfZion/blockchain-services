import { Network } from '@cityofzion/blockchain-service'
import { BSEthereumConstants, BSEthereumNetworkId } from '../constants/BSEthereumConstants'

export class BSEthereumHelper {
  static getNativeAsset(network: Network<BSEthereumNetworkId>) {
    const symbol = this.getNativeSymbol(network)

    return { ...BSEthereumConstants.NATIVE_ASSET, symbol, name: symbol }
  }

  static getNativeSymbol(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.NATIVE_SYMBOL_BY_NETWORK_ID[network.id] ?? 'ETH'
  }

  static getRpcList(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.RPC_LIST_BY_NETWORK_ID[network.id] ?? []
  }

  static isMainnet(network: Network<BSEthereumNetworkId>) {
    return BSEthereumConstants.MAINNET_NETWORK_IDS.includes(network.id)
  }

  static normalizeHash(hash: string): string {
    return hash.startsWith('0x') ? hash.slice(2) : hash
  }

  static wait(duration: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, duration)
    })
  }

  static retry<T = any>(callback: () => Promise<T>): Promise<T> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      // Wait up to 5 seconds
      for (let i = 0; i < 50; i++) {
        try {
          const result = await callback()
          return resolve(result)
        } catch (error: any) {
          if (error.id !== 'TransportLocked') {
            return reject(error)
          }
        }
        await this.wait(100)
      }

      return reject(new Error('timeout'))
    })
  }
}
