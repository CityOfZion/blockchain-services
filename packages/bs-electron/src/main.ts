import { GET_EXPOSED_API_CHANNEL, TApi, TExposedApi, getPropertiesAndMethods, getValueFromPath } from './utils'
import { buildIpcChannelName } from './utils'
import { ipcMain } from 'electron'
import cloneDeep from 'lodash.clonedeep'

const exposedApis: Map<string, TExposedApi> = new Map()
let initialized = false

// Erase the api to expose all methods and properties to renderer. It also supports nested objects
export function eraseApi(api: any, prefix?: string): TExposedApi {
  const { asyncMethods, syncMethods, properties } = getPropertiesAndMethods(api)

  // As it is a recursive function, we need to add the prefix to the methods and properties
  const response: TExposedApi = {
    asyncMethods: asyncMethods.map(method => (prefix ? `${prefix}.${method}` : method)),
    syncMethods: syncMethods.map(method => (prefix ? `${prefix}.${method}` : method)),
    properties: properties.map(property => (prefix ? `${prefix}.${property}` : property)),
  }

  // Iterate for all properties to discover nested objects
  properties.forEach(property => {
    const propertyValue = api[property]
    // If the property is not an object, we don't need to iterate over it. Array is also considered an object so we need to disconsider it
    if (
      typeof propertyValue !== 'object' ||
      Array.isArray(propertyValue) ||
      propertyValue instanceof Map ||
      propertyValue instanceof Set
    )
      return

    const propertyWithPrefix = prefix ? `${prefix}.${property}` : property

    // Recursive call to discover nested properties and methods
    const nestedPropertiesAndMethods = eraseApi(propertyValue, propertyWithPrefix)

    // Add the nested properties and methods to the response
    response.syncMethods.push(...nestedPropertiesAndMethods.syncMethods)
    response.asyncMethods.push(...nestedPropertiesAndMethods.asyncMethods)
    response.properties.push(...nestedPropertiesAndMethods.properties)

    // Remove the actual property because it is a instance and can't be serialized by ipc
    response.properties.splice(response.properties.indexOf(propertyWithPrefix), 1)
  })

  return response
}

export function exposeApiToRenderer<T extends TApi>(api: T) {
  init()

  // Class name
  const apiName = api.constructor.name

  const apiIsAlreadyExposed = exposedApis.has(apiName)
  if (apiIsAlreadyExposed) {
    console.warn(`API ${apiName} is already exposed to renderer`)
    return
  }

  const apiClone = cloneDeep(api)
  const { asyncMethods, properties, syncMethods } = eraseApi(apiClone)

  // For each property, we need to create a listener so renderer can request the property value
  properties.forEach(property => {
    ipcMain.on(buildIpcChannelName(apiName, property), event => {
      try {
        const value = getValueFromPath(api, property)
        event.returnValue = { data: value }
      } catch (error: any) {
        event.returnValue = { error: error.message }
      }
    })
  })

  // For each syncMethods, we need to create a listener so renderer can request the property value. We need to bind the function to the api instance to keep the context, the getValueFromPath function will do this for us
  syncMethods.forEach(method => {
    ipcMain.on(buildIpcChannelName(apiName, method), (event, ...args) => {
      try {
        const func = getValueFromPath(api, method)
        const data = func(...args)
        event.returnValue = { data }
      } catch (error: any) {
        event.returnValue = { error: error.message }
      }
    })
  })

  // For each asyncMethods, we need to create a listener so renderer can request the property value.  We need to bind the function to the api instance to keep the context, the getValueFromPath function will do this for us
  asyncMethods.forEach(method => {
    ipcMain.handle(buildIpcChannelName(apiName, method), async (_event: any, ...args: any) => {
      try {
        const func = getValueFromPath(api, method)
        const data = await func(...args)
        return { data }
      } catch (error: any) {
        return { error: error.message }
      }
    })
  })

  exposedApis.set(apiName, { properties, asyncMethods, syncMethods })
}

// This function is called only once to initialize the ipcMain listener so renderer can request the exposed api
function init() {
  if (initialized) return
  initialized = true

  ipcMain.on(GET_EXPOSED_API_CHANNEL, (event, apiName: string) => {
    const exposedApi = exposedApis.get(apiName)
    event.returnValue = exposedApi
  })
}
