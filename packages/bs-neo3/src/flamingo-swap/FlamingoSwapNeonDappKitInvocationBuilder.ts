import { ContractInvocation, ContractInvocationMulti } from '@cityofzion/neon-dappkit-types'
import { tx, u } from '@cityofzion/neon-core'
import {
  Network,
  SwapControllerServiceSwapToUseArgs,
  SwapControllerServiceSwapToReceiveArgs,
} from '@cityofzion/blockchain-service'
import { FlamingoSwapHelper, SwapScriptHashes } from './FlamingoSwapHelper'
import { BSNeo3NetworkId } from '../BSNeo3Helper'

type TransferArgs = {
  address: string
  amountToUse: string
  tokenToUseScriptHash: string
  contractScriptHash: string
}

type GetReservesArgs = {
  network: Network<BSNeo3NetworkId>
  tokenToReceiveScriptHash: string
  tokenToUseScriptHash: string
}

export class FlamingoSwapNeonDappKitInvocationBuilder {
  static swapInvocation(
    data: SwapControllerServiceSwapToReceiveArgs<BSNeo3NetworkId> | SwapControllerServiceSwapToUseArgs<BSNeo3NetworkId>
  ) {
    return data.type === 'swapTokenToReceive'
      ? this.swapTokenToReceiveForTokenToUseInvocation(data)
      : this.swapTokenToUseForTokenToReceiveInvocation(data)
  }

  static getReservesInvocation({
    network,
    tokenToReceiveScriptHash,
    tokenToUseScriptHash,
  }: GetReservesArgs): ContractInvocationMulti {
    const scriptHashes = FlamingoSwapHelper.getSwapScriptHashes(network)

    return {
      invocations: [
        {
          scriptHash: scriptHashes.flamingoSwapRouter,
          operation: 'getReserves',
          args: [
            {
              type: 'Hash160',
              value: this.overrideScriptHash(network, tokenToReceiveScriptHash),
            },
            {
              type: 'Hash160',
              value: this.overrideScriptHash(network, tokenToUseScriptHash),
            },
          ],
        },
      ],
      signers: [
        {
          scopes: 1,
        },
      ],
    }
  }

  private static swapTokenToReceiveForTokenToUseInvocation({
    address,
    amountToReceive,
    maximumSelling,
    tokenToReceive,
    tokenToUse,
    deadline,
    network,
  }: SwapControllerServiceSwapToReceiveArgs<BSNeo3NetworkId>): ContractInvocationMulti {
    const invocations: ContractInvocation[] = []
    const allowedContracts: string[] = []

    const scriptHashes = FlamingoSwapHelper.getSwapScriptHashes(network)

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
          value: [
            {
              type: 'Hash160',
              value: tokenToUse.hash,
            },
            {
              type: 'Hash160',
              value: tokenToReceiveOverrode.hash,
            },
          ],
        },
        {
          type: 'Integer',
          value: deadline,
        },
      ],
    })

    const isNeoSwapped = tokenToReceive.hash === scriptHashes.neo
    if (isNeoSwapped) {
      const amountToUseInTransferFormatted = u.BigInteger.fromNumber(
        Number(amountToReceiveFormatted) * FlamingoSwapHelper.GAS_PER_NEO
      ).toString()
      const transferContractInvocation = this.transferContractInvocation({
        address,
        amountToUse: amountToUseInTransferFormatted,
        tokenToUseScriptHash: scriptHashes.bneo,
        contractScriptHash: scriptHashes.gas,
      })

      invocations.push(transferContractInvocation)

      allowedContracts.push(...this.allowedContractsTransfer(scriptHashes))
    }

    allowedContracts.push(...this.allowedContractsSwap(scriptHashes, tokenToReceive.hash, tokenToUse.hash))

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

  private static swapTokenToUseForTokenToReceiveInvocation({
    address,
    amountToUse,
    deadline,
    tokenToReceive,
    tokenToUse,
    minimumReceived,
    network,
  }: SwapControllerServiceSwapToUseArgs<BSNeo3NetworkId>): ContractInvocationMulti {
    const invocations: ContractInvocation[] = []
    const allowedContracts: string[] = []

    const scriptHashes = FlamingoSwapHelper.getSwapScriptHashes(network)

    const isNeoSwapped = tokenToUse.hash === scriptHashes.neo
    if (isNeoSwapped) {
      const transferContractInvocation = this.transferContractInvocation({
        address,
        amountToUse,
        tokenToUseScriptHash: scriptHashes.bneo,
        contractScriptHash: scriptHashes.neo,
      })

      invocations.push(transferContractInvocation)

      allowedContracts.push(...this.allowedContractsTransfer(scriptHashes))
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
          value: [
            {
              type: 'Hash160',
              value: tokenToUseOverrode.hash,
            },
            {
              type: 'Hash160',
              value: tokenToReceive.hash,
            },
          ],
        },
        {
          type: 'Integer',
          value: deadline,
        },
      ],
    })

    allowedContracts.push(...this.allowedContractsSwap(scriptHashes, tokenToReceive.hash, tokenToUse.hash))

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

  private static transferContractInvocation({
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

  private static allowedContractsSwap(
    scriptHashes: SwapScriptHashes,
    tokenInScriptHash: string,
    tokenOutScriptHash: string
  ): string[] {
    return [
      scriptHashes.flamingoSwapRouter,
      scriptHashes.flamingoFactory,
      scriptHashes.flamingoPairWhiteList,
      tokenInScriptHash,
      tokenOutScriptHash,
    ]
  }

  private static allowedContractsTransfer(scriptHashes: SwapScriptHashes): string[] {
    return [scriptHashes.gas, scriptHashes.flpBneoGas, scriptHashes.bneo]
  }

  private static overrideScriptHash(network: Network<BSNeo3NetworkId>, scriptHash: string): string {
    const swapScriptHashes = FlamingoSwapHelper.getSwapScriptHashes(network)

    return scriptHash === swapScriptHashes.neo ? swapScriptHashes.bneo : scriptHash
  }
}
