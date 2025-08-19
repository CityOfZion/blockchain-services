import { TBridgeToken } from '@cityofzion/blockchain-service'
import { BSNeo3 } from '@cityofzion/bs-neo3'
import { BSNeoX } from '@cityofzion/bs-neox'

export type TNeo3NeoXBridgeOrchestratorInitParams<BSName extends string> = {
  neo3Service: BSNeo3<BSName>
  neoXService: BSNeoX<BSName>
  initialFromServiceName?: BSName
}

export type TNeo3NeoXBridgeOrchestratorWaitParams<BSName extends string = string> = {
  neo3Service: BSNeo3<BSName>
  neoXService: BSNeoX<BSName>
  transactionHash: string
  tokenToUse: TBridgeToken<BSName>
  tokenToReceive: TBridgeToken<BSName>
}
