import type * as NeonJsCore from '@cityofzion/neon-core'
import type * as NeonJsApi from '@cityofzion/neon-api'
export class BSNeoLegacyNeonJsSingletonHelper {
  static #instanceCore: typeof NeonJsCore
  static #instanceApi: typeof NeonJsApi

  static getInstance() {
    if (!BSNeoLegacyNeonJsSingletonHelper.#instanceCore) {
      BSNeoLegacyNeonJsSingletonHelper.#instanceCore = require('@cityofzion/neon-core')
    }
    if (!BSNeoLegacyNeonJsSingletonHelper.#instanceApi) {
      BSNeoLegacyNeonJsSingletonHelper.#instanceApi = require('@cityofzion/neon-api')
    }

    return { ...BSNeoLegacyNeonJsSingletonHelper.#instanceCore, api: BSNeoLegacyNeonJsSingletonHelper.#instanceApi }
  }
}

export type * from '@cityofzion/neon-core'
