import { Arg, ContractInvocation } from '@cityofzion/neon-dappkit-types'

export type GetReservesParams = {
  routerScriptHash: string
  tokenToReceiveHash: string
  tokenToUseHash: string
}

export type TokenOutForTokenInParams = {
  routerScriptHash: string
  senderAddress: string
  amountToReceive: string
  maximumSelling: string
  deadline: string
  args: Arg[]
}

export type TokenInForTokenOutParams = {
  routerScriptHash: string
  senderAddress: string
  amountToUse: string
  minimumReceived: string
  deadline: string
  args: Arg[]
}

export type TransferArgs = {
  contractHash: string
  senderAddress: string
  tokenHash: string
  amount: string
}

export class NeonDappKitInvocationBuilderNeo3 {
  static getReservesContractInvocation({
    routerScriptHash,
    tokenToReceiveHash,
    tokenToUseHash,
  }: GetReservesParams): ContractInvocation {
    return {
      scriptHash: routerScriptHash,
      operation: 'getReserves',
      args: [
        {
          type: 'Hash160',
          value: tokenToReceiveHash,
        },
        {
          type: 'Hash160',
          value: tokenToUseHash,
        },
      ],
    }
  }

  static swapTokenOutForTokenInContractInvocation({
    routerScriptHash,
    senderAddress,
    amountToReceive,
    maximumSelling,
    deadline,
    args,
  }: TokenOutForTokenInParams): ContractInvocation {
    return {
      scriptHash: routerScriptHash,
      operation: 'swapTokenOutForTokenIn',
      args: [
        {
          type: 'Hash160',
          value: senderAddress,
        },
        {
          type: 'Integer',
          value: amountToReceive,
        },
        {
          type: 'Integer',
          value: maximumSelling,
        },
        {
          type: 'Array',
          value: args,
        },
        {
          type: 'Integer',
          value: deadline,
        },
      ],
    }
  }

  static swapTokenInForTokenOutContractInvocation({
    routerScriptHash,
    senderAddress,
    amountToUse,
    minimumReceived,
    deadline,
    args,
  }: TokenInForTokenOutParams): ContractInvocation {
    return {
      scriptHash: routerScriptHash,
      operation: 'swapTokenInForTokenOut',
      args: [
        {
          type: 'Hash160',
          value: senderAddress,
        },
        {
          type: 'Integer',
          value: amountToUse,
        },
        {
          type: 'Integer',
          value: minimumReceived,
        },
        {
          type: 'Array',
          value: args,
        },
        {
          type: 'Integer',
          value: deadline,
        },
      ],
    }
  }

  static transferContractInvocation({
    contractHash,
    senderAddress,
    tokenHash,
    amount,
  }: TransferArgs): ContractInvocation {
    return {
      scriptHash: contractHash,
      operation: 'transfer',
      args: [
        {
          type: 'Hash160',
          value: senderAddress,
        },
        {
          type: 'Hash160',
          value: tokenHash,
        },
        {
          type: 'Integer',
          value: amount,
        },
        {
          type: 'Any',
          value: null,
        },
      ],
    }
  }
}
