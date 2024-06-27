export class FlamingoSwapError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FlamingoSwapError'
  }
}

export class FlamingoSwapMissingParametersError extends FlamingoSwapError {
  constructor(parameter: string) {
    super(`Missing parameter: ${parameter} for swap invocation`)
  }
}

export class CustomNetworkNotSupportedError extends FlamingoSwapError {
  constructor() {
    super('Custom network is not supported')
  }
}

export class FlamingoInvalidReservesResponseError extends FlamingoSwapError {
  constructor() {
    super('Invalid reserves response')
  }
}
