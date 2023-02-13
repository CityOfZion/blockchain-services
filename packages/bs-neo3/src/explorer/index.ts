export * from './dora/DoraNeo3Responses'
export * from './dora/DoraNeo3Routes'

import { BDSNeo3 } from "../BDSNeo3"

export const explorerOptions = {
    dora: new BDSNeo3()
}