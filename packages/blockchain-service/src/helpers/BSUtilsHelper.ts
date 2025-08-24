import { BSError } from '../error'

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

  static parseBip44Path(bip44Path: string) {
    const pathParts = bip44Path.replace(/^m\//, '').split('/')

    const indices = pathParts.map(part => {
      const isHardened = part.endsWith("'")
      const value = parseInt(part.replace("'", ''), 10)

      if (isNaN(value)) {
        throw new BSError(`Invalid BIP44 path component: ${part}`, 'INVALID_PATH')
      }

      // Apply hardened derivation mask (0x80000000) if needed
      return isHardened ? value | 0x80000000 : value
    })

    if (indices.length !== 5) {
      throw new BSError(`Invalid BIP44 path: expected 5 components, got ${indices.length}`, 'INVALID_PATH')
    }

    return {
      purpose: indices[0],
      coinType: indices[1],
      account: indices[2],
      change: indices[3],
      addressIndex: indices[4],
    }
  }
}
