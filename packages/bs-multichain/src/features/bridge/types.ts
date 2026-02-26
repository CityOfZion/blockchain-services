import type { TBridgeToken } from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'

export type TNeo3NeoXBridgeOrchestratorInitParams<N extends string> = {
  neo3Service: BSNeo3<N>
  neoXService: BSNeoX<N>
  initialFromServiceName?: N
}

export type TNeo3NeoXBridgeOrchestratorWaitParams<N extends string = string> = {
  neo3Service: BSNeo3<N>
  neoXService: BSNeoX<N>
  transactionHash: string
  tokenToUse: TBridgeToken<N>
  tokenToReceive: TBridgeToken<N>
}
