import {
  GetNftParam,
  GetNftsByAddressParams,
  HasTokenParam,
  Network,
  NftDataService,
  NftResponse,
  NftsResponse,
} from '@cityofzion/blockchain-service'
import { BigNumber, ethers } from 'ethers'
import { ERC20_ABI } from '../../assets/abis/ERC20'

export abstract class RpcNDSEthereum implements NftDataService {
  readonly #network: Network

  protected constructor(network: Network) {
    this.#network = network
  }

  abstract getNftsByAddress(params: GetNftsByAddressParams): Promise<NftsResponse>

  abstract getNft(params: GetNftParam): Promise<NftResponse>

  async hasToken({ contractHash, address }: HasTokenParam): Promise<boolean> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(this.#network.url)
      const contract = new ethers.Contract(contractHash, ERC20_ABI, provider)
      const response = await contract.balanceOf(address)
      if (!response) throw new Error()
      const parsedResponse = response as BigNumber
      return parsedResponse.gt(0)
    } catch {
      throw new Error(`Token not found: ${contractHash}`)
    }
  }
}
