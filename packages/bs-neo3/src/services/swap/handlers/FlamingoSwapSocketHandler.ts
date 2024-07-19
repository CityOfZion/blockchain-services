import WebSocket from 'isomorphic-ws'
import { BLOCKCHAIN_WSS_URL } from '../../../constants/FlamingoSwapConstants'

type ListenBlockAddedParams = {
  callback: () => Promise<void> | void
}

export class FlamingoSwapSocketService {
  #ws: WebSocket

  onBlockAdded({ callback }: ListenBlockAddedParams) {
    this.#ws = new WebSocket(BLOCKCHAIN_WSS_URL)

    this.#ws.onopen = () => {
      const block_added = {
        jsonrpc: '2.0',
        method: 'subscribe',
        params: ['block_added'],
        id: 1,
      }

      this.#ws.send(JSON.stringify(block_added))
    }

    this.#ws.onmessage = async () => {
      await callback()
    }
  }

  closeConnection() {
    if (!this.#ws) return

    this.#ws.close()
    this.#ws = null
  }
}
