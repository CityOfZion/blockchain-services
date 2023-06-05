import * as AsteroidSDK from '@moonlight-io/asteroid-sdk-js'

let SDK = AsteroidSDK

// @ts-ignore
if (typeof window !== 'undefined') {
  SDK = require('../polyfills/asteroid-sdk');
}

export { SDK }
export const keychain = new SDK.Keychain()

