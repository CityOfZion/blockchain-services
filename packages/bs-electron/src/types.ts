export type TApi = { [K in keyof any]: any }

export type TExposedApi = {
  properties: string[]
  syncMethods: string[]
  asyncMethods: string[]
}

export type TSerializedError = {
  name: string
  message: string
  code?: string
  stack?: string
  metadata?: Record<string, unknown>
}
