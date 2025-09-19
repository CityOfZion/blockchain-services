import type * as NeonDappKit from '@cityofzion/neon-dappkit'

export class BSNeo3NeonDappKitSingletonHelper {
  static #instance: typeof NeonDappKit

  static getInstance() {
    if (!BSNeo3NeonDappKitSingletonHelper.#instance) {
      BSNeo3NeonDappKitSingletonHelper.#instance = require('@cityofzion/neon-dappkit')
    }

    return BSNeo3NeonDappKitSingletonHelper.#instance
  }
}

export type * from '@cityofzion/neon-dappkit-types'
