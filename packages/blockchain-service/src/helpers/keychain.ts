// @ts-ignore
const SDK = typeof window !== 'undefined' ? require('../polyfills/asteroid-sdk') : require('@moonlight-io/asteroid-sdk-js')

export {SDK}
export const keychain = new SDK.Keychain()

