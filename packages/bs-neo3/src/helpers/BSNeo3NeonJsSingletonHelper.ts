import type * as NeonJs from '@cityofzion/neon-js'

export class BSNeo3NeonJsSingletonHelper {
  static #instance: typeof NeonJs

  static getInstance() {
    if (!BSNeo3NeonJsSingletonHelper.#instance) {
      BSNeo3NeonJsSingletonHelper.#instance = require('@cityofzion/neon-js')
    }

    return BSNeo3NeonJsSingletonHelper.#instance
  }
}

export type { api } from '@cityofzion/neon-js'
export type * from '@cityofzion/neon-core'
