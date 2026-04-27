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
├── utils.ts        # IPC channel building, API introspection utilities
└── window.d.ts     # TypeScript window interface augmentation
```

## Architecture

### How it works

1. **Main process** calls `exposeApiToRenderer(apiName, serviceInstance)` — introspects the service object and registers IPC handlers for every public method and property.
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

### Async detection

The bridge introspects whether each method returns a Promise and handles both sync and async methods correctly over IPC.

### Electron version requirement

Requires `electron >= 35.7.5` (peer dependency). Uses `@electron-toolkit/preload` for the context bridge setup.
