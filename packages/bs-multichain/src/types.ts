import type { IBSNeo3 } from '@cityofzion/bs-neo3'
import type { IBSNeoLegacy } from '@cityofzion/bs-neo-legacy'
import type { IBSEthereum } from '@cityofzion/bs-ethereum'
import type { IBSNeoX } from '@cityofzion/bs-neox'
import type { IBSSolana } from '@cityofzion/bs-solana'
import type { IBSStellar } from '@cityofzion/bs-stellar'

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

export type TBSServiceByName<S extends Array<TBSService>> = {
  [K in S[number]['name']]: Extract<S[number], { name: K }>
}

export type TBSServiceName = TBSService['name']
