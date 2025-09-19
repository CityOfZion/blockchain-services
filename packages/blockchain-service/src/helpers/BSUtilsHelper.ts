import { BSError } from '../error'
import isEqual from 'lodash.isequal'

type RetryOptions = {
  retries?: number
  delay?: number
  shouldRetry?: (error: any) => boolean
}

export class BSUtilsHelper {
  static wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static retry<T = any>(callback: () => Promise<T>, options?: RetryOptions): Promise<T> {
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

  static isEqual(a: any, b: any): boolean {
    return isEqual(a, b)
  }
}
