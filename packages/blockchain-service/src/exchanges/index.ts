export * from './flamingo/Flamingo'
export * from './flamingo/FlamingoResponses'
export * from './flamingo/FlamingoRoutes'

import { Flamingo } from "./flamingo/Flamingo";

export const exchangeOptions = {
    flamingo: new Flamingo()
}