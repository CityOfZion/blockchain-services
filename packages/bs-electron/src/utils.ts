export const CHANNEL_PREFIX = 'bsElectron'
export const GET_EXPOSED_API_CHANNEL = `${CHANNEL_PREFIX}:getExposedApi`

export type TApi = { [K in keyof any]: any }

export type TExposedApi = {
  properties: string[]
  syncMethods: string[]
  asyncMethods: string[]
}

// It returns all properties and methods from an object and its prototype chain, that is, extended classes are also considered
export function getPropertiesAndMethods(object: any) {
  const syncMethods = new Set<string>()
  const asyncMethods = new Set<string>()
  const properties = new Set<string>()

  do {
    for (const key of Reflect.ownKeys(object)) {
      if (key === 'constructor') continue

      const keyString = String(key)
      if (typeof object[key] === 'function') {
        try {
          // Get the number of parameters of the function to call it with empty objects
          const params = Array.from({ length: object[key].length }, () => ({}))
          const funcResponse = object[key].call(object, ...params)
          if (funcResponse instanceof Promise) {
            funcResponse.catch(() => {}).then(() => {})
            asyncMethods.add(keyString)
            continue
          }

          syncMethods.add(keyString)
        } catch {
          syncMethods.add(keyString)
        }

        continue
      }

      properties.add(keyString)
    }
  } while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype)

  return {
    properties: Array.from(properties),
    syncMethods: Array.from(syncMethods),
    asyncMethods: Array.from(asyncMethods),
  }
}

export function getValueFromPath(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => {
    // If the key is a function, we need to bind it to the object to keep the context
    if (typeof acc[key] === 'function') {
      return acc[key].bind(acc)
    }

    return acc[key]
  }, obj)
}

export function populateObjectFromPath(obj: any, path: string, value: PropertyDescriptor & ThisType<any>) {
  const splittedPath = path.split('.')
  let tempObj = obj
  for (let i = 0; i < splittedPath.length; i++) {
    const property = splittedPath[i]
    if (i === splittedPath.length - 1) {
      Object.defineProperty(tempObj, property, value)
    } else {
      tempObj[property] = tempObj[property] ?? {}
      tempObj = tempObj[property]
    }
  }

  return obj
}

export function buildIpcChannelName<T>(apiName: string, methodOrProperty: keyof T) {
  return `${CHANNEL_PREFIX}:${apiName}:${String(methodOrProperty)}`
}

export function toPlainObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(toPlainObject)
  }

  const plain: any = {}
  const allKeys = new Set<string>()

  // Walk through the prototype chain to get all properties
  let currentObj = obj
  while (currentObj && currentObj !== Object.prototype) {
    Object.getOwnPropertyNames(currentObj).forEach(key => {
      if (key !== 'constructor') {
        allKeys.add(key)
      }
    })
    currentObj = Object.getPrototypeOf(currentObj)
  }

  for (const key of allKeys) {
    try {
      // Get the property descriptor to check if it's a getter
      const descriptor =
        Object.getOwnPropertyDescriptor(obj, key) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), key)

      if (descriptor) {
        if (descriptor.get) {
          // It's a getter, call it to get the value
          const value = obj[key]
          plain[key] = toPlainObject(value)
        } else if (descriptor.value !== undefined) {
          // It's a regular property
          plain[key] = toPlainObject(descriptor.value)
        }
      } else if (obj[key] !== undefined) {
        // Fallback for edge cases
        plain[key] = toPlainObject(obj[key])
      }
    } catch {
      // Skip properties that can't be accessed
      continue
    }
  }

  return plain
}
