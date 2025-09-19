import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('ipcBsElectron', electronAPI.ipcRenderer)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error IPC is not defined in the global scope
  window.ipcBsElectron = ipcRenderer
}
