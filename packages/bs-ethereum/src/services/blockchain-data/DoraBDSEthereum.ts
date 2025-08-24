import { RpcBDSEthereum } from './RpcBDSEthereum'
import {
  BSFullTransactionsByAddressHelper,
  FullTransactionsByAddressParams,
  Network,
  NetworkId,
  TokenService,
} from '@cityofzion/blockchain-service'
import { ethers } from 'ethers'
import { BSEthereumNetworkId } from '../../constants/BSEthereumConstants'

export class DoraBDSEthereum<BSNetworkId extends NetworkId = BSEthereumNetworkId> extends RpcBDSEthereum {
  readonly _supportedErc721Standards = ['erc721', 'erc-721']
  readonly _supportedErc1155Standards = ['erc1155', 'erc-1155']
  readonly _supportedErc20Standards = ['erc20', 'erc-20']
  readonly _supportedFullTransactionsByAddressNetworks: BSNetworkId[]

  constructor(
    network: Network<BSNetworkId>,
    supportedFullTransactionsByAddressNetworks: BSNetworkId[],
    tokenService: TokenService
  ) {
    super(network, tokenService)

    this._supportedFullTransactionsByAddressNetworks = supportedFullTransactionsByAddressNetworks
  }

  _validateFullTransactionsByAddressParams(
    params: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo'>
  ) {
    if (!this._supportedFullTransactionsByAddressNetworks.includes(this._network.id as BSNetworkId))
      throw new Error('This network is not supported')

    BSFullTransactionsByAddressHelper.validateFullTransactionsByAddressParams(params)

    if (!ethers.utils.isAddress(params.address)) throw new Error('Invalid address param')
  }

  _validateGetFullTransactionsByAddressParams({
    pageSize,
    ...params
  }: Pick<FullTransactionsByAddressParams, 'address' | 'dateFrom' | 'dateTo' | 'pageSize'>) {
    if (typeof pageSize === 'number' && (isNaN(pageSize) || pageSize < 1 || pageSize > 500))
      throw new Error('Page size should be between 1 and 500')

    this._validateFullTransactionsByAddressParams(params)
  }
}
