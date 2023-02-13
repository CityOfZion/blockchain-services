export * from './dora/DoraResponsesNeoLegacy'
export * from './dora/DoraRoutesNeoLegacy'

import { BDSNeoLegacy } from "../BDSNeoLegacy"

export const explorerNeoLegacyOption = {
    dora: new BDSNeoLegacy()
}