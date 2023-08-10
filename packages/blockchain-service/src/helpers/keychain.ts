import type AsteroidSDK from '@moonlight-io/asteroid-sdk-js'

const SDK: typeof AsteroidSDK =
  // @ts-ignore
  typeof window !== 'undefined' ? require('../polyfills/asteroid-sdk') : require('@moonlight-io/asteroid-sdk-js')

export { SDK }
export const keychain = new SDK.Keychain()
