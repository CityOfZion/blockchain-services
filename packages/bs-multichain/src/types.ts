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
