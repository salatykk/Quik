import { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, Tray, Menu, nativeImage } from 'electron'
import { readFileSync, writeFileSync, appendFileSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import * as emb from './nativeEmb'
import { startMediaDaemon, stopMediaDaemon, readMediaSnapshot } from './media'
import { initUpdater, checkForUpdates, downloadUpdate, getUpdateState } from './updater'
import type { UpdateState } from '../src/types'

const isDev = !!process.env.VITE_DEV_SERVER_URL

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=160 --max-semi-space-size=8')

interface WidgetSlot {
  type: string
  defaultSize: { width: number; height: number }
}

const WIDGET_SLOTS: WidgetSlot[] = [
  { type: 'clock', defaultSize: { width: 320, height: 122 } },
  { type: 'weather', defaultSize: { width: 320, height: 148 } },
  { type: 'crypto', defaultSize: { width: 320, height: 258 } },
  { type: 'music', defaultSize: { width: 320, height: 216 } },
  { type: 'maps', defaultSize: { width: 340, height: 330 } }
]

interface WidgetState {
  x: number
  y: number
  width: number
  height: number
  custom?: boolean
}
type WidgetStateMap = Record<string, WidgetState>

const widgetWindows = new Map<string, BrowserWindow>()
const dragState = new Map<string, { sx: number; sy: number; wx: number; wy: number }>()
const resizeState = new Map<string, { sx: number; sy: number; w: number; h: number }>()
let overlayWindow: BrowserWindow | null = null
let isOverlayVisible = false
let pendingPanel: string | null = null
let tray: Tray | null = null
let wallpaperWindow: BrowserWindow | null = null
let wallpaperHwnd: emb.NativeHwnd | null = null
let wallpaperEmbedded = false
let lastWallpaperKey = ''

interface EmbeddedApp {
  id: string
  pid: number
  hwnd: emb.NativeHwnd | null
  child: ChildProcess | null
  base: string
  rect: { x: number; y: number; width: number; height: number; dpr: number } | null
}

const embeddedApps = new Map<string, EmbeddedApp>()

function embedLog(msg: string): void {
  try {
    appendFileSync(path.join(app.getPath('userData'), 'quik-embed.log'), `${new Date().toISOString()} ${msg}\n`)
  } catch {}
}

function releaseEmbedded(id?: string): void {
  if (id) {
    const e = embeddedApps.get(id)
    if (!e) return
    if (e.hwnd && emb.alive(e.hwnd)) emb.detach(e.hwnd)
    e.hwnd = null
    return
  }
  embeddedApps.forEach(e => {
    if (e.hwnd && emb.alive(e.hwnd)) emb.detach(e.hwnd)
    e.hwnd = null
  })
}

const widgetState: WidgetStateMap = loadState()

function statePath(): string {
  return path.join(app.getPath('userData'), 'quik-widgets.json')
}

function loadState(): WidgetStateMap {
  try {
    return JSON.parse(readFileSync(statePath(), 'utf8'))
  } catch {
    return {}
  }
}

function saveState(): void {
  try {
    writeFileSync(statePath(), JSON.stringify(widgetState, null, 2), 'utf8')
  } catch {}
}

function loadRoute(win: BrowserWindow, hash: string): void {
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}#${hash}`)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), { hash })
  }
}

function computeBounds(slot: WidgetSlot, index: number): WidgetState {
  const saved = widgetState[slot.type]
  if (saved) {
    return {
      x: saved.x,
      y: saved.y,
      width: saved.width || slot.defaultSize.width,
      height: saved.height || slot.defaultSize.height
    }
  }

  const area = screen.getPrimaryDisplay().workArea
  const margin = 24
  const gap = 16
  const topPad = 56
  const rightPad = 32

  let y = area.y + topPad
  for (let i = 0; i < index; i++) {
    const prev = WIDGET_SLOTS[i] || { type: slot.type, defaultSize: slot.defaultSize }
    y += (widgetState[prev.type]?.height ?? prev.defaultSize.height) + gap
  }

  const width = slot.defaultSize.width
  const height = slot.defaultSize.height
  const x = area.x + area.width - width - rightPad
  const bounds = { x, y, width, height }

  widgetState[slot.type] = bounds
  return bounds
}

function createWidgetWindow(slot: WidgetSlot, index: number): void {
  if (widgetWindows.has(slot.type)) return

  const bounds = computeBounds(slot, index)

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true
    }
  })

  win.setAlwaysOnTop(false)
  widgetWindows.set(slot.type, win)
  loadRoute(win, `widget/${slot.type}`)

  win.on('closed', () => {
    widgetWindows.delete(slot.type)
  })
}

function createWallpaperWindow(): void {
  if (wallpaperWindow) return
  const bounds = screen.getPrimaryDisplay().bounds
  const area = screen.getPrimaryDisplay().workArea

  wallpaperWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    focusable: false,
    roundedCorners: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  })

  wallpaperWindow.setAlwaysOnTop(false)
  wallpaperWindow.setIgnoreMouseEvents(true, { forward: true })
  wallpaperWindow.setVisibleOnAllWorkspaces(true)
  loadRoute(wallpaperWindow, 'wallpaper')

  wallpaperWindow.webContents.on('did-finish-load', () => {
    if (!wallpaperWindow) return
    const hwnd = wallpaperWindow.getNativeWindowHandle()
    wallpaperHwnd = hwnd
    wallpaperEmbedded = false
    setTimeout(() => {
      if (wallpaperWindow && wallpaperHwnd) {
        try {
          wallpaperEmbedded = emb.embedIntoDesktop(wallpaperHwnd)
          if (wallpaperEmbedded) emb.layoutToDesktop(wallpaperHwnd)
        } catch {
          wallpaperEmbedded = false
        }
      }
      wallpaperWindow?.setBounds(area)
      wallpaperWindow?.showInactive()
    }, 400)
  })

  wallpaperWindow.on('closed', () => {
    wallpaperWindow = null
    wallpaperHwnd = null
    wallpaperEmbedded = false
  })
}

function destroyWallpaperWindow(): void {
  if (wallpaperWindow) {
    try { wallpaperWindow.destroy() } catch {}
    wallpaperWindow = null
  }
  wallpaperHwnd = null
  wallpaperEmbedded = false
}

function syncWallpaper(bg: { type: string; value?: string; opacity?: number; fit?: string } | null | undefined): void {
  const key = JSON.stringify({ t: bg?.type, v: bg?.value, o: bg?.opacity, f: bg?.fit })

  if (!bg || bg.type === 'none' || !bg.value) {
    if (key !== lastWallpaperKey) destroyWallpaperWindow()
    lastWallpaperKey = key
    return
  }

  const created = !wallpaperWindow || wallpaperWindow.isDestroyed()
  createWallpaperWindow()
  if (created) {
    lastWallpaperKey = key
    return
  }
  if (key === lastWallpaperKey) return
  lastWallpaperKey = key
  try {
    loadRoute(wallpaperWindow!, 'wallpaper')
  } catch {}
}

function createCustomWidgetWindow(id: string, width: number, height: number, index: number): void {
  if (widgetWindows.has(id)) return

  const slot: WidgetSlot = { type: id, defaultSize: { width, height } }
  const bounds = computeBounds(slot, index)

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true
    }
  })

  win.setAlwaysOnTop(false)
  widgetWindows.set(id, win)
  loadRoute(win, `widget/${id}`)

  win.on('closed', () => {
    widgetWindows.delete(id)
  })
}

function syncCustomWidgets(list: { id: string; width: number; height: number }[]): void {
  const current = new Set(list.map(x => x.id))
  for (const [id, win] of widgetWindows) {
    if (win.isDestroyed() || win === overlayWindow || win === wallpaperWindow) continue
    if (id.startsWith('custom-') && !current.has(id)) {
      try { win.destroy() } catch {}
    }
  }
  list.forEach((x, i) => {
    const existing = widgetWindows.get(x.id)
    if (existing && !existing.isDestroyed()) {
      const [w, h] = existing.getSize()
      if (w !== x.width || h !== x.height) {
        existing.setSize(x.width, x.height)
        widgetState[x.id] = { ...widgetState[x.id], width: x.width, height: x.height }
      }
      return
    }
    createCustomWidgetWindow(x.id, x.width, x.height, i)
  })
  saveState()
}

function createOverlayWindow(): void {
  if (overlayWindow) return

  const bounds = screen.getPrimaryDisplay().bounds

  overlayWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true,
      webviewTag: true
    }
  })

  loadRoute(overlayWindow, 'overlay')
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true)

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
}

function createTray(): void {
  const iconPath = path.join(app.getAppPath(), 'icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Quik')

  const buildMenu = (): Menu => {
    const atLogin = app.getLoginItemSettings().openAtLogin
    return Menu.buildFromTemplate([
      { label: 'Открыть Quik', click: () => showOverlay(null) },
      { label: 'Настройки', click: () => showOverlay('settings') },
      { type: 'separator' },
      {
        label: 'Запуск с Windows',
        type: 'checkbox',
        checked: atLogin,
        click: item => app.setLoginItemSettings({ openAtLogin: item.checked })
      },
      { type: 'separator' },
      { label: 'Выход', click: () => app.quit() }
    ])
  }

  tray.setContextMenu(buildMenu())
  tray.on('click', () => showOverlay(null))
  tray.on('double-click', () => showOverlay(null))
}

function showOverlay(panel?: string | null): void {
  if (overlayWindow) {
    if (!isOverlayVisible) {
      isOverlayVisible = true
      overlayWindow.show()
      overlayWindow.focus()
    }
    if (panel) {
      overlayWindow.webContents.send('overlay-panel', panel)
    }
    return
  }

  if (panel) pendingPanel = panel
  createOverlayWindow()
  isOverlayVisible = true
  overlayWindow?.show()
  overlayWindow?.focus()
}

function closeOverlay(): void {
  isOverlayVisible = false
  releaseEmbedded()
  if (overlayWindow) {
    overlayWindow.hide()
    overlayWindow.destroy()
    overlayWindow = null
  }
}

function toggleOverlay(): void {
  if (overlayWindow && isOverlayVisible) {
    closeOverlay()
    return
  }
  showOverlay(null)
}

function resolveShortcut(linkPath: string): Promise<string | null> {
  return new Promise(resolve => {
    const ps = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($args[0]); Write-Output $s.TargetPath',
        linkPath
      ],
      { windowsHide: true }
    )
    let out = ''
    let err = ''
    ps.stdout.on('data', d => (out += String(d)))
    ps.stderr.on('data', d => (err += String(d)))
    ps.on('error', () => resolve(null))
    ps.on('close', code => {
      const target = out.trim()
      resolve(target && /\.(exe|bat|cmd)$/i.test(target) ? target : null)
    })
  })
}

function waitForWindow(pid: number, baseLower: string, timeoutMs = 20000): Promise<emb.NativeHwnd | null> {
  return new Promise(resolve => {
    const started = Date.now()
    const tick = () => {
      const hwnd = emb.findWindowForPid(pid) || emb.findWindowForExe(baseLower)
      if (hwnd) {
        resolve(hwnd)
        return
      }
      if (Date.now() - started > timeoutMs) {
        resolve(null)
        return
      }
      setTimeout(tick, 250)
    }
    tick()
  })
}

app.whenReady().then(() => {
  WIDGET_SLOTS.forEach((slot, i) => createWidgetWindow(slot, i))
  createTray()
  startMediaDaemon(embedLog)

  globalShortcut.register('CommandOrControl+Shift+Tab', toggleOverlay)

  let changelogOpened = false
  initUpdater({
    broadcast: (s: UpdateState) => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('updater-state', s)
      }
      if (s.phase === 'changelog' && !changelogOpened) {
        changelogOpened = true
        setTimeout(() => showOverlay(null), 900)
      }
    },
    openOverlay: () => showOverlay(null)
  })

  ipcMain.handle('update-check', checkForUpdates)
  ipcMain.handle('update-download', downloadUpdate)
  ipcMain.handle('update-get-state', getUpdateState)

  if (app.isPackaged) {
    setTimeout(() => checkForUpdates(), 5000)
  }

  ipcMain.on('open-overlay', (_e, panel?: string) => {
    showOverlay(panel || null)
  })
  ipcMain.on('close-overlay', closeOverlay)

  ipcMain.handle('get-start-panel', () => {
    const p = pendingPanel
    pendingPanel = null
    return p
  })

  ipcMain.on('widget-drag-start', (_e, id: string, sx: number, sy: number) => {
    const win = widgetWindows.get(id)
    if (!win) return
    const [wx, wy] = win.getPosition()
    dragState.set(id, { sx, sy, wx, wy })
  })

  ipcMain.on('widget-drag-move', (_e, id: string, sx: number, sy: number) => {
    const win = widgetWindows.get(id)
    const state = dragState.get(id)
    if (!win || !state) return
    const dx = Math.round(sx - state.sx)
    const dy = Math.round(sy - state.sy)
    const x = state.wx + dx
    const y = state.wy + dy
    const area = screen.getDisplayNearestPoint({ x, y }).workArea
    win.setPosition(
      Math.min(Math.max(x, area.x - win.getBounds().width + 40), area.x + area.width - 40),
      Math.min(Math.max(y, area.y), area.y + area.height - 30)
    )
    const [nx, ny] = win.getPosition()
    widgetState[id] = { ...widgetState[id], x: nx, y: ny }
    saveState()
  })

  ipcMain.on('widget-drag-end', (_e, id: string) => {
    dragState.delete(id)
  })

  ipcMain.on('widget-resize', (_e, id: string, sx: number, sy: number) => {
    const win = widgetWindows.get(id)
    if (!win) return
    const [w, h] = win.getContentSize()
    const state = resizeState.get(id)
    if (!state) return
    const newW = Math.max(240, state.w + Math.round(sx - state.sx))
    const newH = Math.max(120, state.h + Math.round(sy - state.sy))
    win.setContentSize(newW, newH)
    win.setPosition(
      win.getPosition()[0],
      Math.min(Math.max(win.getPosition()[1], screen.getPrimaryDisplay().workArea.y), screen.getPrimaryDisplay().workArea.y + screen.getPrimaryDisplay().workArea.height - newH)
    )
    widgetState[id] = { x: win.getPosition()[0], y: win.getPosition()[1], width: newW, height: newH, custom: true }
    saveState()
  })

  ipcMain.on('widget-resize-start', (_e, id: string, sx: number, sy: number) => {
    const win = widgetWindows.get(id)
    if (!win) return
    const [w, h] = win.getContentSize()
    resizeState.set(id, { sx, sy, w, h })
  })

  ipcMain.on('widget-resize-end', (_e, id: string) => {
    resizeState.delete(id)
    saveState()
  })

  ipcMain.on('widget-set-scale', (_e, id: string, scale: number) => {
    const win = widgetWindows.get(id)
    const slot = WIDGET_SLOTS.find(s => s.type === id)
    if (!win || !slot) return
    const newW = Math.round(slot.defaultSize.width * scale)
    const newH = Math.round(slot.defaultSize.height * scale)
    const [cx, cy] = win.getPosition()
    const [curW, curH] = win.getSize()
    win.setSize(newW, newH)
    const x = Math.round(cx + (curW - newW) / 2)
    const y = Math.round(cy + (curH - newH) / 2)
    const area = screen.getDisplayNearestPoint({ x, y }).workArea
    win.setPosition(
      Math.min(Math.max(x, area.x), area.x + area.width - newW),
      Math.min(Math.max(y, area.y), area.y + area.height - newH)
    )
    widgetState[id] = { x: win.getPosition()[0], y: win.getPosition()[1], width: newW, height: newH, custom: false }
    saveState()
  })

  ipcMain.on('widget-set-visible', (_e, id: string, visible: boolean) => {
    const win = widgetWindows.get(id)
    if (!win) return
    if (visible) win.showInactive()
    else win.hide()
  })

  ipcMain.handle('widget-customized', (_e, id: string) => !!widgetState[id]?.custom)

  ipcMain.handle('get-media', () => readMediaSnapshot())

  ipcMain.handle('get-app-version', () => app.getVersion())

  ipcMain.handle('embed-app', async (_e, id: string, appPath: string) => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return { ok: false, reason: 'no-overlay' }

    const log = embedLog

    const prev = embeddedApps.get(id)
    if (prev) {
      if (prev.hwnd && emb.alive(prev.hwnd)) return { ok: true, reattached: true }
      embeddedApps.delete(id)
    }

    let exePath = appPath
    if (/\.lnk$/i.test(appPath)) {
      const resolved = await resolveShortcut(appPath)
      if (!resolved) return { ok: false, reason: 'bad-shortcut' }
      exePath = resolved
    }

    const baseLower = path.basename(exePath).toLowerCase()
    log(`start ${id} path=${exePath}`)

    let child: ChildProcess | null = null
    try {
      child = spawn(exePath, [], { detached: true, stdio: 'ignore', windowsHide: true })
      child.unref()
    } catch (err) {
      log(`spawn-failed ${String(err)}`)
      return { ok: false, reason: 'spawn-failed' }
    }

    const entry: EmbeddedApp = { id, pid: child.pid, hwnd: null, child, monitor: null, base: baseLower, rect: null }
    embeddedApps.set(id, entry)

    try {
      const hwnd = await waitForWindow(child ? child.pid : 0, baseLower, 20000)
      if (!hwnd) {
        log('window-not-found')
        if (child) {
          try { child.kill() } catch {}
        }
        embeddedApps.delete(id)
        return { ok: false, reason: 'window-not-found' }
      }

      const parentHwnd = overlayWindow.getNativeWindowHandle()
      const tryAttach = (target: emb.NativeHwnd): boolean => {
        try {
          emb.attach(target, parentHwnd)
          entry.hwnd = target
          log(`attached hwnd=${String(target)}`)
          return true
        } catch (err) {
          log(`attach-failed ${String(err && (err as Error).message || err)}`)
          return false
        }
      }
      tryAttach(hwnd)

      return { ok: true }
    } catch (err) {
      log(`embed-error ${String(err && (err as Error).message || err)}`)
      if (child) {
        try { child.kill() } catch {}
      }
      embeddedApps.delete(id)
      return { ok: false, reason: String((err as Error).message || err) }
    }
  })

  ipcMain.on('layout-app', (_e, id: string, rect: { x: number; y: number; width: number; height: number }, dpr: number) => {
    const e = embeddedApps.get(id)
    if (!e || !overlayWindow || overlayWindow.isDestroyed()) return
    const scale = Math.max(0.5, dpr || 1)
    e.rect = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, dpr: scale }
    if (!e.hwnd || !emb.alive(e.hwnd)) return
    const [ox, oy] = overlayWindow.getPosition()
    emb.layout(e.hwnd, ox + rect.x * scale, oy + rect.y * scale, rect.width * scale, rect.height * scale)
  })

  ipcMain.on('release-app', (_e, id: string) => {
    releaseEmbedded(id)
  })

  ipcMain.handle('embed-status', () => {
    const out: Record<string, { pid: number; attached: boolean }> = {}
    embeddedApps.forEach((e, id) => {
      out[id] = { pid: e.pid, attached: !!(e.hwnd && emb.alive(e.hwnd)) }
    })
    return out
  })

  ipcMain.handle('open-app', (_e, appPath: string) => {
    try {
      spawn('cmd.exe', ['/c', 'start', '/min', '""', `"${appPath}"`], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('pick-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Программы', extensions: ['exe', 'lnk', 'bat', 'cmd', 'appref-ms'] },
        { name: 'Все файлы', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('pick-media', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Выберите изображение или видео',
      filters: [
        { name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] },
        { name: 'Видео', extensions: ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'gif'] },
        { name: 'Все файлы', extensions: ['*'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.on('set-wallpaper', (_e, bg: { type: string; value?: string; opacity?: number; fit?: string }) => {
    syncWallpaper(bg)
    if (wallpaperWindow && bg && bg.type !== 'none' && bg.value) {
      wallpaperWindow.setIgnoreMouseEvents(true, { forward: true })
    }
  })

  ipcMain.on('sync-custom-widgets', (_e, list: { id: string; width: number; height: number }[]) => {
    syncCustomWidgets(list || [])
  })

  ipcMain.handle('get-autostart', () => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('set-autostart', (_e, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return enabled
  })

  setInterval(() => {
    if (wallpaperWindow && !wallpaperWindow.isDestroyed()) {
      if (wallpaperHwnd && emb.alive(wallpaperHwnd)) {
        if (!wallpaperEmbedded) {
          try {
            wallpaperEmbedded = emb.embedIntoDesktop(wallpaperHwnd)
          } catch {
            wallpaperEmbedded = false
          }
        }
        if (wallpaperEmbedded) emb.layoutToDesktop(wallpaperHwnd)
      }
    }
    if (embeddedApps.size === 0) return
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const parentBuf = overlayWindow.getNativeWindowHandle()
    if (!parentBuf || parentBuf.length < 8) return
    const parentVal = parentBuf.readBigUInt64LE(0)
    const [ox, oy] = overlayWindow.getPosition()
    embeddedApps.forEach(e => {
      let hwnd = e.hwnd
      if (!hwnd || !emb.alive(hwnd)) {
        const next = emb.findWindowForPid(e.pid) || emb.findWindowForExe(e.base)
        if (!next) return
        hwnd = next
      }
      const cur = emb.parentOf(hwnd)
      if (cur !== parentVal) {
        try {
          emb.attach(hwnd, parentBuf)
          e.hwnd = hwnd
          embedLog(`refresh-attach hwnd=${String(hwnd)}`)
        } catch (err) {
          embedLog(`refresh-attach-failed ${String(err && (err as Error).message || err)}`)
          return
        }
      }
      if (e.rect) emb.layout(hwnd, ox + e.rect.x * e.rect.dpr, oy + e.rect.y * e.rect.dpr, e.rect.width * e.rect.dpr, e.rect.height * e.rect.dpr)
    })
  }, 600)

  let lastMedia: string | null = null
  setInterval(() => {
    const snap = readMediaSnapshot()
    const key = JSON.stringify(snap)
    if (key === lastMedia) return
    lastMedia = key
    widgetWindows.forEach(win => {
      if (!win.isDestroyed()) win.webContents.send('media-update', snap)
    })
  }, 1200)
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  releaseEmbedded()
  stopMediaDaemon()
  saveState()
})

app.on('window-all-closed', () => {
  app.quit()
})