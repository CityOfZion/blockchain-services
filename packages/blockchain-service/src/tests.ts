import type { AxiosInstance, AxiosStatic } from 'axios'
import http from 'node:http'
import https from 'node:https'

import { BSCommonConstants } from './constants/BSCommonConstants'

type TOptions = {
  axios: AxiosStatic
}

const DOMAINS = [BSCommonConstants.COZ_API_URL, BSCommonConstants.COZ_API_STAGE_URL]
const API_KEY = process.env.TEST_COZ_API_KEY
const HEADER_NAME = 'x-api-key'
const patched = new WeakSet<object>()

function isCozApiUrl(url: string) {
  return DOMAINS.some(domain => url.startsWith(domain))
}

function isCozApiHost(host: string) {
  return DOMAINS.some(domain => host === new URL(domain).host)
}

function applyAxiosInterceptor(instance: AxiosInstance) {
  instance.interceptors.request.use(config => {
    const url = `${config.baseURL || ''}${config.url || ''}`

    if (isCozApiUrl(url)) {
      config.headers.set(HEADER_NAME, API_KEY)
    }

    return config
  })
}

function setupAxiosTest(instance: AxiosStatic) {
  if (patched.has(instance)) return

  patched.add(instance)

  applyAxiosInterceptor(instance)

  const originalCreate = instance.create.bind(instance)

  instance.create = ((config?: Parameters<typeof originalCreate>[0]) => {
    const created = originalCreate(config)

    applyAxiosInterceptor(created)

    return created
  }) as typeof instance.create
}

function setupFetchTest() {
  if (patched.has(globalThis.fetch)) return

  const originalFetch = globalThis.fetch.bind(globalThis)

  const patchedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    if (isCozApiUrl(url)) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))

      headers.set(HEADER_NAME, API_KEY)

      return originalFetch(input, { ...init, headers })
    }

    return originalFetch(input, init)
  }) as typeof globalThis.fetch

  patched.add(patchedFetch)
  globalThis.fetch = patchedFetch
}

function setupHttpTest() {
  for (const module of [http, https]) {
    if (patched.has(module.request)) continue

    const originalRequest = module.request as (...args: unknown[]) => http.ClientRequest

    const patchedRequest = ((...args: unknown[]) => {
      const [arg1, arg2] = args

      if (typeof arg1 === 'string' || arg1 instanceof URL) {
        const host = arg1 instanceof URL ? arg1.host : new URL(arg1).host
        const options = arg2 && typeof arg2 === 'object' ? (arg2 as http.RequestOptions) : undefined

        if (isCozApiHost(host) && options) {
          options.headers = { ...options.headers, [HEADER_NAME]: API_KEY }
        }
      } else if (arg1 && typeof arg1 === 'object') {
        const options = arg1 as http.RequestOptions
        const host = String(options.host || options.hostname || '')

        if (isCozApiHost(host)) {
          options.headers = { ...options.headers, [HEADER_NAME]: API_KEY }
        }
      }

      return originalRequest(...args)
    }) as typeof module.request

    patched.add(patchedRequest)
    module.request = patchedRequest
  }
}

export const setupTests = ({ axios }: TOptions) => {
  if (!API_KEY) return

  setupAxiosTest(axios)
  setupFetchTest()
  setupHttpTest()
}
