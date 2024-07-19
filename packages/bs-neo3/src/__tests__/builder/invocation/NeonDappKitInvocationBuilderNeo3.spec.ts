import { ContractInvocation } from '@cityofzion/neon-dappkit-types'
import {
  GetReservesParams,
  NeonDappKitInvocationBuilderNeo3,
  TokenInForTokenOutParams,
  TokenOutForTokenInParams,
  TransferArgs,
} from '../../../builder/invocation/NeonDappKitInvocationBuilderNeo3'

describe('NeonDappKitInvocationBuilderNeo3', () => {
  it('Should return the contract invocation of getReserves', () => {
    const params: GetReservesParams = {
      routerScriptHash: 'routerScriptHash',
      tokenToReceiveHash: 'tokenToReceiveHash',
      tokenToUseHash: 'tokenToUseHash',
    }

    const response = NeonDappKitInvocationBuilderNeo3.getReservesContractInvocation(params)

    const expectedResponse: ContractInvocation = {
      scriptHash: params.routerScriptHash,
      operation: 'getReserves',
      args: [
        {
          type: 'Hash160',
          value: params.tokenToReceiveHash,
        },
        {
          type: 'Hash160',
          value: params.tokenToUseHash,
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should return the contract invocation of swapTokenOutForTokenIn', () => {
    const params: TokenOutForTokenInParams = {
      amountToReceive: '1',
      args: [],
      deadline: '1',
      maximumSelling: '1',
      routerScriptHash: 'routerScriptHash',
      senderAddress: 'senderAddress',
    }

    const response = NeonDappKitInvocationBuilderNeo3.swapTokenOutForTokenInContractInvocation(params)

    const expectedResponse: ContractInvocation = {
      scriptHash: params.routerScriptHash,
      operation: 'swapTokenOutForTokenIn',
      args: [
        {
          type: 'Hash160',
          value: params.senderAddress,
        },
        {
          type: 'Integer',
          value: params.amountToReceive,
        },
        {
          type: 'Integer',
          value: params.maximumSelling,
        },
        {
          type: 'Array',
          value: params.args,
        },
        {
          type: 'Integer',
          value: params.deadline,
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should return the contract invocation of swapTokenInForTokenOut', () => {
    const params: TokenInForTokenOutParams = {
      amountToUse: '1',
      args: [],
      deadline: '1',
      minimumReceived: '1',
      routerScriptHash: 'routerScriptHash',
      senderAddress: 'senderAddress',
    }

    const response = NeonDappKitInvocationBuilderNeo3.swapTokenInForTokenOutContractInvocation(params)

    const expectedResponse: ContractInvocation = {
      scriptHash: params.routerScriptHash,
      operation: 'swapTokenInForTokenOut',
      args: [
        {
          type: 'Hash160',
          value: params.senderAddress,
        },
        {
          type: 'Integer',
          value: params.amountToUse,
        },
        {
          type: 'Integer',
          value: params.minimumReceived,
        },
        {
          type: 'Array',
          value: params.args,
        },
        {
          type: 'Integer',
          value: params.deadline,
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })

  it('Should return the contract invocation of transfer', () => {
    const params: TransferArgs = {
      amount: '1',
      contractHash: 'contractHash',
      senderAddress: 'senderAddress',
      tokenHash: 'tokenHash',
    }

    const response = NeonDappKitInvocationBuilderNeo3.transferContractInvocation(params)

    const expectedResponse: ContractInvocation = {
      scriptHash: params.contractHash,
      operation: 'transfer',
      args: [
        {
          type: 'Hash160',
          value: params.senderAddress,
        },
        {
          type: 'Hash160',
          value: params.tokenHash,
        },
        {
          type: 'Integer',
          value: params.amount,
        },
        {
          type: 'Any',
          value: null,
        },
      ],
    }

    expect(response).toEqual(expectedResponse)
  })
})
