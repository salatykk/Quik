import { contextBridge, ipcRenderer } from 'electron'
import type { MediaSnapshot } from '../src/types'

const api = {
  openOverlay: (panel?: 'settings' | 'account') => ipcRenderer.send('open-overlay', panel),
  closeOverlay: () => ipcRenderer.send('close-overlay'),
  onOverlayPanel: (cb: (panel: 'settings' | 'account') => void) => {
    ipcRenderer.on('overlay-panel', (_e, panel) => cb(panel))
  },
  getStartPanel: () => ipcRenderer.invoke('get-start-panel'),

  widgetDragStart: (id: string, sx: number, sy: number) =>
    ipcRenderer.send('widget-drag-start', id, sx, sy),
  widgetDragMove: (id: string, sx: number, sy: number) =>
    ipcRenderer.send('widget-drag-move', id, sx, sy),
  widgetDragEnd: (id: string) => ipcRenderer.send('widget-drag-end', id),

  widgetResizeStart: (id: string, sx: number, sy: number) =>
    ipcRenderer.send('widget-resize-start', id, sx, sy),
  widgetResize: (id: string, sx: number, sy: number) =>
    ipcRenderer.send('widget-resize', id, sx, sy),
  widgetResizeEnd: (id: string) => ipcRenderer.send('widget-resize-end', id),

  widgetSetVisible: (id: string, visible: boolean) =>
    ipcRenderer.send('widget-set-visible', id, visible),

  widgetSetScale: (id: string, scale: number) =>
    ipcRenderer.send('widget-set-scale', id, scale),

  widgetCustomized: (id: string) => ipcRenderer.invoke('widget-customized', id),

  getMedia: () => ipcRenderer.invoke('get-media'),
  onMediaUpdate: (cb: (snap: MediaSnapshot | null) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, snap: MediaSnapshot | null) => cb(snap)
    ipcRenderer.on('media-update', handler)
    return () => ipcRenderer.removeListener('media-update', handler)
  },

  openApp: (appPath: string) => ipcRenderer.invoke('open-app', appPath),
  pickFile: () => ipcRenderer.invoke('pick-file'),
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (enabled: boolean) => ipcRenderer.invoke('set-autostart', enabled),

  embedApp: (id: string, appPath: string) => ipcRenderer.invoke('embed-app', id, appPath),
  layoutApp: (
    id: string,
    rect: { x: number; y: number; width: number; height: number },
    dpr: number
  ) => ipcRenderer.send('layout-app', id, rect, dpr),
  releaseApp: (id: string) => ipcRenderer.send('release-app', id),
  embedStatus: () => ipcRenderer.invoke('embed-status'),

  getAppVersion: () => ipcRenderer.invoke('get-app-version')
}

contextBridge.exposeInMainWorld('quik', api)

export type QuikApi = typeof api