import type { TBridgeToken, TBSBridgeName } from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'

export type TNeo3NeoXBridgeOrchestratorInitParams = {
  neo3Service: BSNeo3
  neoXService: BSNeoX
  initialFromServiceName?: TBSBridgeName
}

export type TNeo3NeoXBridgeOrchestratorWaitParams = {
  neo3Service: BSNeo3
  neoXService: BSNeoX
  transactionHash: string
  tokenToUse: TBridgeToken<TBSBridgeName>
  tokenToReceive: TBridgeToken<TBSBridgeName>
}
