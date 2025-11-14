import { GET_EXPOSED_API_CHANNEL, TApi, TExposedApi, eraseApi, getValueFromPath } from './utils'
import { buildIpcChannelName } from './utils'
import { ipcMain } from 'electron'
import cloneDeep from 'lodash.clonedeep'

const exposedApis: Map<string, TExposedApi> = new Map()
let initialized = false

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
        event.returnValue = { error: { message: error.message, stack: error.stack, name: error.name } }
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
        event.returnValue = { error: { message: error.message, stack: error.stack, name: error.name } }
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
        return { error: { message: error.message, stack: error.stack, name: error.name } }
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
