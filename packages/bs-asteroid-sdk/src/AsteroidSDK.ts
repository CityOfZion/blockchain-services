import type AsteroidSDKType from '@moonlight-io/asteroid-sdk-js'

const AsteroidSDK: typeof AsteroidSDKType =
  // @ts-ignore
  typeof window !== 'undefined' ? require('./polyfill') : require('@moonlight-io/asteroid-sdk-js')

export { AsteroidSDK }
