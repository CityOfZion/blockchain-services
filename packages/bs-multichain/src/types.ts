import type { BSError } from '@cityofzion/blockchain-service'
import type { IBSNeo3 } from '@cityofzion/bs-neo3'
import type { IBSNeoLegacy } from '@cityofzion/bs-neo-legacy'
import type { IBSEthereum } from '@cityofzion/bs-ethereum'
import type { IBSNeoX } from '@cityofzion/bs-neox'
import type { IBSSolana } from '@cityofzion/bs-solana'
import type { IBSStellar } from '@cityofzion/bs-stellar'
import type { IBSBitcoin } from '@cityofzion/bs-bitcoin'

export type TBSService =
  | IBSNeo3
  | IBSNeoLegacy
  | IBSEthereum<'ethereum'>
  | IBSEthereum<'polygon'>
  | IBSEthereum<'base'>
  | IBSEthereum<'arbitrum'>
  | IBSNeoX
  | IBSSolana
  | IBSStellar
  | IBSBitcoin

export type TBSServiceByName<S extends Array<TBSService>> = {
  [K in S[number]['name']]: Extract<S[number], { name: K }>
}

export type TBSServiceName = TBSService['name']

export type TDeepPartial<T> = {
  [P in keyof T]?: Partial<T[P] extends object ? T[P] : T[P]>
}

export type TRequiredByKey<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type TOrchestratorValue<T> = { value: T | null }

export type TOrchestratorValidatableValue<T extends TOrchestratorValue<any>> = T & {
  valid: boolean | null
  error: BSError | null
  validating: boolean
}

export type TOrchestratorLoadableValue<T extends TOrchestratorValue<any>> = T & { loading: boolean }

export type TOrchestratorFormattableValue<T extends TOrchestratorValue<any>> = T & {
  formatting: boolean
  formatted: string | null
}

export type TOrchestratorValueWithoutNull<T> =
  T extends TOrchestratorFormattableValue<infer U>
    ? T & { value: U; formatted: string }
    : T extends TOrchestratorValue<infer U>
      ? T & { value: U }
      : T

export type TOrchestratorStateAbleToPerform<T> = {
  [P in keyof T]: TOrchestratorValueWithoutNull<T[P]>
}
