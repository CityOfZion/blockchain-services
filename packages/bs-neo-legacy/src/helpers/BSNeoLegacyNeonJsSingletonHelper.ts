import type * as NeonJs from '@cityofzion/neon-js'

export class BSNeoLegacyNeonJsSingletonHelper {
  static #instance: typeof NeonJs

  static getInstance() {
    if (!BSNeoLegacyNeonJsSingletonHelper.#instance) {
      BSNeoLegacyNeonJsSingletonHelper.#instance = require('@cityofzion/neon-js')
    }

    return BSNeoLegacyNeonJsSingletonHelper.#instance
  }
}

export type * from '@cityofzion/neon-js'
