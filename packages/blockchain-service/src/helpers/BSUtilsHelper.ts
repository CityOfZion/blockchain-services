import { BSError } from '../error'
import isEqual from 'lodash.isequal'
import type { TBSNetwork } from '../interfaces'
import { TBSUtilsHelperRetryOptions } from '../types'

export class BSUtilsHelper {
  static wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static retry<T = any>(callback: () => Promise<T>, options?: TBSUtilsHelperRetryOptions): Promise<T> {
    const { retries = 50, delay = 100, shouldRetry } = options || {}

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let errorMessage: string = ''

      for (let i = 0; i < retries; i++) {
        try {
          const result = await callback()
          return resolve(result)
        } catch (error: any) {
          errorMessage = error.message
          if (shouldRetry && !shouldRetry(error)) {
            return reject(error)
          }
        }
        await this.wait(delay)
      }

      return reject(new BSError('Timeout: ' + errorMessage, 'TIMEOUT'))
    })
  }

  static validateNetwork(network: TBSNetwork, availableNetworks: TBSNetwork[], networkUrls: string[]) {
    const isValid = availableNetworks.some(networkItem =>
      isEqual(
        { id: network.id, type: network.type, name: network.name },
        { id: networkItem.id, type: networkItem.type, name: networkItem.name }
      )
    )

    if (!isValid) return false

    return networkUrls.some(url => url === network.url)
  }

  static tryCatch<T>(
    callback: () => T
  ): T extends Promise<infer R> ? Promise<[R, undefined] | [undefined, any]> : [T, undefined] | [undefined, any] {
    try {
      const result = callback()

      if (result instanceof Promise) {
        return result
          .then(res => [res, undefined] as [typeof res, undefined])
          .catch(err => [undefined, err as Error] as [undefined, Error]) as any
      }

      return [result, undefined] as any
    } catch (error) {
      return [undefined, error as Error] as any
    }
  }

  static isBase64(str: string): boolean {
    const base64Regex = /^(?:[A-Z0-9+/]{4})*(?:[A-Z0-9+/]{2}==|[A-Z0-9+/]{3}=)?$/i
    return base64Regex.test(str)
  }
}
