import { Arg, ContractInvocation, ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { tx, u } from '@cityofzion/neon-core'
import {
  Network,
  SwapControllerServiceSwapToReceiveArgs,
  SwapControllerServiceSwapToUseArgs,
  Token,
} from '@cityofzion/blockchain-service'
import { FlamingoSwapHelper } from './FlamingoSwapHelper'
import { BSNeo3NetworkId } from '../BSNeo3Helper'
import { FlamingoSwapConstants, FlamingoSwapScriptHashes } from './FlamingoSwapConstants'

type TransferArgs = {
  address: string
  amountToUse: string
  tokenToUseScriptHash: string
  contractScriptHash: string
}

export type GetReservesArgs = {
  network: Network<BSNeo3NetworkId>
  route: { tokenToUse: Token; tokenToReceive: Token }[]
}

export class FlamingoSwapNeonDappKitInvocationBuilder {
  static swapInvocation(
    data: SwapControllerServiceSwapToReceiveArgs<BSNeo3NetworkId> | SwapControllerServiceSwapToUseArgs<BSNeo3NetworkId>
  ) {
    return data.type === 'swapTokenToReceive'
      ? this.#swapTokenToReceiveForTokenToUseInvocation(data)
      : this.#swapTokenToUseForTokenToReceiveInvocation(data)
  }

  static getReservesInvocation({ network, route }: GetReservesArgs): ContractInvocationMulti {
    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const invocations: ContractInvocation[] = []

    route.map(routeItem => {
      if (
        routeItem.tokenToUse.hash === FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO').hash ||
        routeItem.tokenToReceive.hash === FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO').hash
      ) {
        return // Exit the current iteration of the loop and continue to the next iteration.
      }

      invocations.push({
        scriptHash: scriptHashes.flamingoSwapRouter,
        operation: 'getReserves',
        args: [
          {
            type: 'Hash160',
            value: routeItem.tokenToReceive.hash,
          },
          {
            type: 'Hash160',
            value: routeItem.tokenToUse.hash,
          },
        ],
      })
    })

    return {
      invocations,
      signers: [
        {
          scopes: 1,
        },
      ],
    }
  }

  static #swapTokenToReceiveForTokenToUseInvocation({
    address,
    amountToReceive,
    maximumSelling,
    routePath,
    deadline,
    network,
  }: SwapControllerServiceSwapToReceiveArgs<BSNeo3NetworkId>): ContractInvocationMulti {
    const invocations: ContractInvocation[] = []
    const allowedContracts: string[] = []

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const tokenToUse = routePath[0]
    const tokenToReceive = routePath[routePath.length - 1]

    const tokenToReceiveOverrode = FlamingoSwapHelper.overrideToken(network, tokenToReceive)

    const amountToReceiveFormatted = u.BigInteger.fromDecimal(
      Number(amountToReceive),
      tokenToReceiveOverrode.decimals
    ).toString()
    const maximumSellingFormatted = u.BigInteger.fromDecimal(Number(maximumSelling), tokenToUse.decimals).toString()

    invocations.push({
      scriptHash: scriptHashes.flamingoSwapRouter,
      operation: 'swapTokenOutForTokenIn',
      args: [
        {
          type: 'Hash160',
          value: address,
        },
        {
          type: 'Integer',
          value: amountToReceiveFormatted,
        },
        {
          type: 'Integer',
          value: maximumSellingFormatted,
        },
        {
          type: 'Array',
          value: this.#buildContractScriptHashesArgs(routePath),
        },
        {
          type: 'Integer',
          value: deadline,
        },
      ],
    })

    if (FlamingoSwapHelper.isNeoToken(network, tokenToReceive)) {
      const amountToUseInTransferFormatted = u.BigInteger.fromNumber(
        Number(amountToReceiveFormatted) * FlamingoSwapConstants.GAS_PER_NEO
      ).toString()

      const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')
      const GAS = FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS')

      const transferContractInvocation = this.#transferContractInvocation({
        address,
        amountToUse: amountToUseInTransferFormatted,
        tokenToUseScriptHash: bNEO.hash,
        contractScriptHash: GAS.hash,
      })

      invocations.push(transferContractInvocation)

      allowedContracts.push(...this.#allowedContractsTransfer(network))
    }

    allowedContracts.push(...this.#allowedContractsSwap(scriptHashes, routePath))

    return {
      invocations,
      signers: [
        {
          scopes: tx.WitnessScope.CustomContracts,
          allowedContracts,
        },
      ],
    }
  }

  static #swapTokenToUseForTokenToReceiveInvocation({
    address,
    amountToUse,
    deadline,
    routePath,
    minimumReceived,
    network,
  }: SwapControllerServiceSwapToUseArgs<BSNeo3NetworkId>): ContractInvocationMulti {
    const invocations: ContractInvocation[] = []
    const allowedContracts: string[] = []

    const scriptHashes = FlamingoSwapHelper.getFlamingoSwapScriptHashes(network)

    const tokenToUse = routePath[0]
    const tokenToReceive = routePath[routePath.length - 1]

    if (FlamingoSwapHelper.isNeoToken(network, tokenToUse)) {
      const NEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'NEO')
      const bNEO = FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO')

      const transferContractInvocation = this.#transferContractInvocation({
        address,
        amountToUse,
        tokenToUseScriptHash: bNEO.hash,
        contractScriptHash: NEO.hash,
      })

      invocations.push(transferContractInvocation)

      allowedContracts.push(...this.#allowedContractsTransfer(network))
    }

    const tokenToUseOverrode = FlamingoSwapHelper.overrideToken(network, tokenToUse)

    const amountToUseFormatted = u.BigInteger.fromDecimal(Number(amountToUse), tokenToUseOverrode.decimals).toString()
    const minimumReceivedFormatted = u.BigInteger.fromDecimal(
      Number(minimumReceived),
      tokenToReceive.decimals
    ).toString()

    invocations.push({
      scriptHash: scriptHashes.flamingoSwapRouter,
      operation: 'swapTokenInForTokenOut',
      args: [
        {
          type: 'Hash160',
          value: address,
        },
        {
          type: 'Integer',
          value: amountToUseFormatted,
        },
        {
          type: 'Integer',
          value: minimumReceivedFormatted,
        },
        {
          type: 'Array',
          value: this.#buildContractScriptHashesArgs(routePath),
        },
        {
          type: 'Integer',
          value: deadline,
        },
      ],
    })

    allowedContracts.push(...this.#allowedContractsSwap(scriptHashes, routePath))

    return {
      invocations,
      signers: [
        {
          scopes: tx.WitnessScope.CustomContracts,
          allowedContracts,
        },
      ],
    }
  }

  static #buildContractScriptHashesArgs(routePath: Token[]): Arg[] {
    return routePath.map(token => ({
      type: 'Hash160',
      value: token.hash,
    }))
  }

  static #transferContractInvocation({
    address,
    amountToUse,
    contractScriptHash,
    tokenToUseScriptHash,
  }: TransferArgs): ContractInvocation {
    return {
      scriptHash: contractScriptHash,
      operation: 'transfer',
      args: [
        {
          type: 'Hash160',
          value: address,
        },
        {
          type: 'Hash160',
          value: tokenToUseScriptHash,
        },
        {
          type: 'Integer',
          value: amountToUse,
        },
        {
          type: 'Any',
          value: null,
        },
      ],
    }
  }

  static #allowedContractsSwap(scriptHashes: FlamingoSwapScriptHashes, routePath: Token[]): string[] {
    return [
      scriptHashes.flamingoSwapRouter,
      scriptHashes.flamingoFactory,
      scriptHashes.flamingoPairWhiteList,
      ...routePath.map(token => token.hash),
    ]
  }

  static #allowedContractsTransfer(network: Network): string[] {
    return [
      FlamingoSwapHelper.getFlamingoSwapToken(network, 'GAS').hash,
      FlamingoSwapHelper.getFlamingoSwapPool(network, 'FLP-bNEO-GAS').hash,
      FlamingoSwapHelper.getFlamingoSwapToken(network, 'bNEO').hash,
    ]
  }
}
