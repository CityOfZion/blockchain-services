import type { TBSNetwork } from '@cityofzion/blockchain-service'
import { BSEthereumConstants } from '../constants/BSEthereumConstants'
import type { TBSEthereumNetworkId } from '../types'

export class BSEthereumHelper {
  static getNativeAsset(network: TBSNetwork<TBSEthereumNetworkId>) {
    const symbol = BSEthereumConstants.NATIVE_SYMBOL_BY_NETWORK_ID[network.id] || 'ETH'

    return { symbol, name: symbol, hash: '-', decimals: 18 }
  }

  // Accepts decimal or hex strings (e.g. gas values from transaction payloads), ignoring empty values
  static getMaxBigInt(...values: (string | bigint | null | undefined)[]): bigint {
    return values.reduce<bigint>((max, value) => {
      if (value === null || value === undefined || value === '') return max
      const valueBigInt = BigInt(value)
      return valueBigInt > max ? valueBigInt : max
    }, 0n)
  }
}
