import { GET_EXPOSED_API_CHANNEL, TApi, TExposedApi, buildIpcChannelName, populateObjectFromPath } from './utils'

const boundApis: Map<string, TApi> = new Map()

export function bindApiFromMain<T extends TApi = any>(apiName: string) {
  const boundApi = boundApis.get(apiName)
  if (boundApi) {
    return boundApi as T
  }

  // Request the exposed api from main
  const exposedApi: TExposedApi | undefined = window.ipcBsElectron.sendSync(GET_EXPOSED_API_CHANNEL, apiName)
  if (!exposedApi) {
    throw new Error(`API ${apiName} is not exposed to renderer`)
  }

  const api = {} as T

  // For each property, we need to populate the api with a getter so the renderer can request the property value from main
  exposedApi.properties.forEach(property => {
    populateObjectFromPath(api, String(property), {
      get: () => {
        const result = window.ipcBsElectron.sendSync(buildIpcChannelName(apiName, property))
        if (result.error) {
          throw new Error('Ipc only supports stringified data')
        }
        return result.data
      },
    })
  })

  // For each syncMethods, we need to populate the api with a function that will send a sync message to main to request the method execution result
  exposedApi.syncMethods.forEach(method => {
    populateObjectFromPath(api, String(method), {
      value: (...args: any[]) => {
        const result = window.ipcBsElectron.sendSync(buildIpcChannelName(apiName, method), ...args)
        if (result.error) {
          throw new Error(result.error)
        }
        return result.data
      },
    })
  })

  // For each asyncMethods, we need to populate the api with a function that will send a sync message to main to request the method execution result
  exposedApi.asyncMethods.forEach(method => {
    populateObjectFromPath(api, String(method), {
      value: async (...args: any[]) => {
        const result = await window.ipcBsElectron.invoke(buildIpcChannelName(apiName, method), ...args)
        if (result.error) {
          throw new Error(result.error)
        }
        return result.data
      },
    })
  })

  boundApis.set(apiName, api)

  return api
}
