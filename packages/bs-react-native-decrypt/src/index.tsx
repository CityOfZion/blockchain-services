import { NativeModules, Platform } from 'react-native'

const LINKING_ERROR =
  `The package 'bs-react-native-decrypt' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n'

const BsReactNativeDecrypt = NativeModules.BsReactNativeDecrypt
  ? NativeModules.BsReactNativeDecrypt
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR)
        },
      }
    )

export function decryptNeo3(key: string, password: string): Promise<string> {
  return BsReactNativeDecrypt.decryptNeo3(key, password)
}

export function decryptNeoLegacy(key: string, password: string): Promise<string> {
  return BsReactNativeDecrypt.decryptNeoLegacy(key, password)
}
