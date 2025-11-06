export const CHANNEL_PREFIX = 'bsElectron'
export const GET_EXPOSED_API_CHANNEL = `${CHANNEL_PREFIX}:getExposedApi`

export type TApi = { [K in keyof any]: any }

export type TExposedApi = {
  properties: string[]
  syncMethods: string[]
  asyncMethods: string[]
}

export function fixSimpleObject(api: TExposedApi) {
  const methods = [...api.asyncMethods, ...api.syncMethods]

  const newProperties = new Set<string>()

  for (const property of api.properties) {
    const pathSegments = property.split('.')

    // Handle root level properties (no dots)
    if (pathSegments.length === 1) {
      newProperties.add(property)
      continue
    }

    const pathWithoutLastSegment = pathSegments.slice(0, -1).join('.')

    // Skip if we already processed this parent path
    if (newProperties.has(pathWithoutLastSegment)) {
      continue
    }

    // Check if this path or any of its sub-paths have methods
    const hasMethod = methods.some(method => method.startsWith(pathWithoutLastSegment))
    if (hasMethod) {
      newProperties.add(property)
      continue
    }

    // If no methods are found in this path, it means it's a simple object, so we add only the parent path
    newProperties.add(pathWithoutLastSegment)
  }

  return Array.from(newProperties)
}

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
    ) {
      return
    }

    const propertyWithPrefix = prefix ? `${prefix}.${property}` : property

    // Recursive call to discover nested properties and methods
    const nestedResult = eraseApi(propertyValue, propertyWithPrefix)

    // Add the nested properties and methods to the response
    response.syncMethods.push(...nestedResult.syncMethods)
    response.asyncMethods.push(...nestedResult.asyncMethods)
    response.properties.push(...nestedResult.properties)

    // Remove the actual property because it is a instance and can't be serialized by ipc
    response.properties.splice(response.properties.indexOf(propertyWithPrefix), 1)
  })

  response.properties = fixSimpleObject({
    asyncMethods: response.asyncMethods,
    syncMethods: response.syncMethods,
    properties: response.properties,
  })

  return response
}

// It returns all properties and methods from an object and its prototype chain, that is, extended classes are also considered
export function getPropertiesAndMethods(object: any) {
  const syncMethods = new Set<string>()
  const asyncMethods = new Set<string>()
  const properties = new Set<string>()

  do {
    for (const key of Reflect.ownKeys(object)) {
      try {
        if (key === 'constructor') continue

        const keyString = String(key)

        if (keyString.startsWith('_') || keyString.startsWith('#')) continue

        if (typeof object[key] === 'function') {
          const funcString = object[key].toString()

          // Check for async patterns:
          // 1. Native async: 'async function' or 'async ('
          // 2. TypeScript compiled: '__awaiter' helper
          // 3. Babel compiled: '_asyncToGenerator' helper
          const isAsync =
            funcString.includes('__awaiter') ||
            funcString.includes('_asyncToGenerator') ||
            funcString.startsWith('async ') ||
            funcString.startsWith('async(') ||
            funcString.includes('async function')

          if (isAsync) {
            asyncMethods.add(keyString)
          } else {
            syncMethods.add(keyString)
          }

          continue
        }

        properties.add(keyString)
      } catch {
        continue
      }
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
