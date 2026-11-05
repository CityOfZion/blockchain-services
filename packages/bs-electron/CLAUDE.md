# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

Electron IPC bridge. Exposes blockchain service APIs from the Electron main process to the renderer process in a type-safe way, without bundling the full service libraries into the renderer.

## Commands

```bash
rushx build
rushx test
rushx lint
rushx typecheck
```

## Structure

```
src/
├── main.ts         # Main process: exposeApiToRenderer<T>()
├── renderer.ts     # Renderer process: bindApiFromMain<T>()
├── preload.ts      # Electron preload script (context bridge)
├── types.ts        # TApi, TExposedApi, TSerializedError
├── utils.ts        # IPC channel building, API introspection, error (de)serialization
└── window.d.ts     # TypeScript window interface augmentation
```

## Architecture

### How it works

1. **Main process** calls `exposeApiToRenderer(serviceInstance)` — uses `serviceInstance.constructor.name` as the API name, introspects the service object and registers IPC handlers for every public method and property.
2. **Preload script** uses Electron's `contextBridge` to safely expose a stub object to the renderer.
3. **Renderer process** calls `bindApiFromMain(apiName)` — returns a proxy object whose methods dispatch IPC messages to the main process and await the response.

### Protected method exclusion

Methods and properties prefixed with `_` are automatically excluded from the exposed API. This is why the monorepo convention requires all internal/protected methods to start with `_`.

### IPC channel naming

`buildIpcChannelName(apiName, methodPath)` in `utils.ts` constructs deterministic channel names using dot-notation paths, supporting nested objects.

### Key utilities in `utils.ts`

- `eraseApi()` — extracts the shape (methods + properties) of a service object
- `getPropertiesAndMethods()` — walks the prototype chain to collect all members
- `getValueFromPath()` / `populateObjectFromPath()` — dot-notation path access for nested APIs
- `toPlainObject()` — converts class instances to plain objects for IPC serialization (IPC cannot pass class instances)
- `serializeError()` — converts a thrown error into a plain `TSerializedError` (`name`, `message`, `code`, `stack`, `metadata`)
- `deserializeError()` — rebuilds a `BSError` when `code` is present (otherwise a plain `Error`), restoring `name` and `stack`

### Error propagation

Main process handlers catch errors and return `{ error: serializeError(error) }`. The renderer proxy throws `deserializeError(result.error)`, so `error instanceof BSError` and `error.code` / `error.metadata` work in the renderer just like in main. Binding an API that was never exposed throws `BSError(..., 'API_NOT_EXPOSED')`.

### Async detection

The bridge introspects whether each method returns a Promise and handles both sync and async methods correctly over IPC.

### Electron version requirement

Requires `electron >= 35.7.5` (peer dependency). Uses `@electron-toolkit/preload` for the context bridge setup.
