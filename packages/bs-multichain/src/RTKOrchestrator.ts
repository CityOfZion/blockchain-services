import { BSError } from '@cityofzion/blockchain-service'
import {
  configureStore,
  createSlice,
  type EnhancedStore,
  type PayloadAction,
  type Slice,
  type Unsubscribe,
} from '@reduxjs/toolkit'
import type { TDeepPartial } from './types'
import fastDeepEqual from 'fast-deep-equal'

export class RTKOrchestrator<T extends Record<string, any>> {
  #unsubscribes: Unsubscribe[] = []
  store: EnhancedStore<T>
  slice: Slice<T>

  constructor(initialState: T) {
    this.slice = createSlice({
      name: 'orchestrator',
      initialState: initialState,
      reducers: {
        setState: (_state, action: PayloadAction<T>) => action.payload,
      },
    })

    this.store = configureStore({
      reducer: this.slice.reducer,
      middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false }),
    })
  }

  _resetState(partialState: TDeepPartial<T> = {}) {
    const initialState = this.slice.getInitialState() as T

    const newState = { ...initialState }

    for (const key in partialState) {
      if (partialState[key]) {
        newState[key] = initialState[key]
      }
    }

    this.store.dispatch(this.slice.actions.setState(newState))
  }

  _setState(partialState: TDeepPartial<T>) {
    let changed = false

    const currentState = this.store.getState() as T
    const newState = { ...currentState }

    for (const key in partialState) {
      const patch = partialState[key]
      if (!patch) continue

      const currentSlice = newState[key]
      const nextSlice = { ...currentSlice, ...patch }

      const sliceChanged = Object.keys(patch).some(patchKey => currentSlice[patchKey] !== nextSlice[patchKey])

      if (sliceChanged) {
        newState[key] = nextSlice
        changed = true
      }
    }

    this.store.dispatch(this.slice.actions.setState(changed ? newState : currentState))
  }

  _getState(): T {
    return this.store.getState()
  }

  _treatError(error: unknown): BSError {
    if (error instanceof BSError) return error

    return new BSError('An unexpected error occurred', 'UNEXPECTED_ERROR', { cause: error })
  }

  _subscribe<U>(selector: (state: T) => U, listener: (selected: U, prev: U) => void) {
    let previousSelectedState = selector(this.store.getState() as T)

    const unsubscribe = this.store.subscribe(() => {
      const nextSelectedState = selector(this.store.getState() as T)

      if (!fastDeepEqual(previousSelectedState, nextSelectedState)) {
        const previousState = previousSelectedState

        previousSelectedState = nextSelectedState

        listener(nextSelectedState, previousState)
      }
    })

    this.#unsubscribes.push(unsubscribe)

    return listener
  }

  public cleanup() {
    this.#unsubscribes.forEach(unsubscribe => unsubscribe())
    this.#unsubscribes = []
  }
}
