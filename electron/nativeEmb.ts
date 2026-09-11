import * as koffi from 'koffi'

const user32 = koffi.load('user32.dll')
const H = koffi.pointer('HANDLE_t', 'void')

const IsWindow = user32.func('__stdcall', 'IsWindow', 'int', [H])
const GetWindowThreadProcessId = user32.func('__stdcall', 'GetWindowThreadProcessId', 'uint32', [H, 'void *'])
const SetParent = user32.func('__stdcall', 'SetParent', H, [H, H])
const GetParent = user32.func('__stdcall', 'GetParent', H, [H])
const SetWindowPos = user32.func('__stdcall', 'SetWindowPos', 'int', [H, H, 'int', 'int', 'int', 'int', 'int'])
const MoveWindow = user32.func('__stdcall', 'MoveWindow', 'int', [H, 'int', 'int', 'int', 'int', 'int'])
const ShowWindow = user32.func('__stdcall', 'ShowWindow', 'int', [H, 'int'])
const IsWindowVisible = user32.func('__stdcall', 'IsWindowVisible', 'int', [H])
const GetWindowLongPtrW = user32.func('__stdcall', 'GetWindowLongPtrW', 'int64', [H, 'int'])
const GetClassNameW = user32.func('__stdcall', 'GetClassNameW', 'int', [H, 'void *', 'int'])
const FindWindowW = user32.func('__stdcall', 'FindWindowW', H, ['str16', 'str16'])
const FindWindowExW = user32.func('__stdcall', 'FindWindowExW', H, [H, H, 'str16', 'str16'])
const SendMessageW = user32.func('__stdcall', 'SendMessageW', 'intptr', [H, 'uint32', 'intptr', 'intptr'])
const GetWindowRect = user32.func('__stdcall', 'GetWindowRect', 'int', [H, 'void *'])
const GetClientRect = user32.func('__stdcall', 'GetClientRect', 'int', [H, 'void *'])
const EnumWindowsProc = koffi.proto('EnumWindowsProc', 'int', [H, 'intptr'])
const EnumWindows = user32.func('__stdcall', 'EnumWindows', 'int', [koffi.pointer(EnumWindowsProc), 'intptr'])
const ker = koffi.load('kernel32.dll')
const OpenProcess = ker.func('__stdcall', 'OpenProcess', H, ['uint32', 'int', 'uint32'])
const QueryFullProcessImageNameW = ker.func('__stdcall', 'QueryFullProcessImageNameW', 'int', [H, 'uint32', 'void *', 'void *'])
const CloseHandle = ker.func('__stdcall', 'CloseHandle', 'int', [H])

const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

const GWL_STYLE = -16
const WS_CHILD = 0x40000000
const SWP_NOZORDER = 0x0004
const SWP_NOACTIVATE = 0x0010
const SWP_FRAMECHANGED = 0x0020
const SWP_NOMOVE = 0x0002
const SWP_NOSIZE = 0x0001
const SW_HIDE = 0
const SW_SHOWMINNOACTIVE = 7
const SW_SHOWNOACTIVATE = 4

export type NativeHwnd = unknown

export function alive(hwnd: NativeHwnd): boolean {
  try {
    return IsWindow(hwnd) !== 0
  } catch {
    return false
  }
}

export function isVisible(hwnd: NativeHwnd): boolean {
  try {
    return IsWindowVisible(hwnd) !== 0
  } catch {
    return false
  }
}

function enumerateTopWindows(): NativeHwnd[] {
  const list: NativeHwnd[] = []
  try {
    EnumWindows((hwnd: NativeHwnd) => {
      list.push(hwnd)
      return 1
    }, 0)
  } catch {}
  return list
}

export function findWindowForPid(pid: number): NativeHwnd | null {
  const list = enumerateTopWindows()
  for (const hwnd of list) {
    const pidBuf = koffi.alloc('uint32', 1)
    GetWindowThreadProcessId(hwnd, pidBuf)
    if (koffi.decode(pidBuf, 'uint32') === pid) return hwnd
  }
  return null
}

function processImageName(pid: number): string | null {
  const proc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid)
  if (!proc) return null
  try {
    const buf = Buffer.alloc(32768)
    const size = koffi.alloc('uint32', 1)
    koffi.encode(size, 'uint32', 16384)
    const ok = QueryFullProcessImageNameW(proc, 0, buf, size)
    if (!ok) return null
    const n = koffi.decode(size, 'uint32')
    if (!n) return null
    let s = ''
    for (let i = 0; i < n; i++) s += String.fromCharCode(buf.readUInt16LE(i * 2))
    return s.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? null
  } finally {
    CloseHandle(proc)
  }
}

export function findWindowForExe(exeNameLower: string): NativeHwnd | null {
  const list = enumerateTopWindows()
  const cache = new Map<number, string | null>()
  const imageOf = (pid: number): string | null => {
    if (cache.has(pid)) return cache.get(pid)!
    const name = processImageName(pid)
    cache.set(pid, name)
    return name
  }
  let fallback: NativeHwnd | null = null
  for (const hwnd of list) {
    const pidBuf = koffi.alloc('uint32', 1)
    GetWindowThreadProcessId(hwnd, pidBuf)
    const pid = koffi.decode(pidBuf, 'uint32')
    if (imageOf(pid) !== exeNameLower) continue
    if (!fallback) fallback = hwnd
    if (isVisible(hwnd)) return hwnd
  }
  return fallback
}

export function attach(hwnd: NativeHwnd, parentHwnd: Buffer): void {
  ShowWindow(hwnd, SW_HIDE)
  SetParent(hwnd, parentHwnd)
  SetWindowPos(hwnd, null, 0, 0, 1, 1, SWP_NOZORDER | SWP_NOACTIVATE)
}

export function parentOf(hwnd: NativeHwnd): number | null {
  try {
    const par = GetParent(hwnd)
    if (!par) return null
    const n = Number(String(par))
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function layout(hwnd: NativeHwnd, x: number, y: number, w: number, h: number): void {
  MoveWindow(hwnd, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), 1)
  ShowWindow(hwnd, SW_SHOWNOACTIVATE)
}

export function detach(hwnd: NativeHwnd): void {
  try {
    SetWindowPos(hwnd, null, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED)
    SetParent(hwnd, null)
    ShowWindow(hwnd, SW_SHOWMINNOACTIVE)
  } catch {}
}

export function isChild(hwnd: NativeHwnd): boolean {
  try {
    const style = Number(GetWindowLongPtrW(hwnd, GWL_STYLE))
    return (style & WS_CHILD) !== 0
  } catch {
    return false
  }
}

const HWND_BOTTOM = -1 as unknown as NativeHwnd

function className(hwnd: NativeHwnd): string | null {
  try {
    const buf = Buffer.alloc(256)
    const n = GetClassNameW(hwnd, buf, 256)
    if (n <= 0) return null
    let s = ''
    for (let i = 0; i < n; i++) s += String.fromCharCode(buf.readUInt16LE(i * 2))
    return s
  } catch {
    return null
  }
}

export function sendToBottom(hwnd: NativeHwnd): boolean {
  try {
    const buf = koffi.alloc('int32', 4)
    GetWindowRect(hwnd, buf)
    const r = { x: 0, y: 0, w: 0, h: 0 }
    r.x = Number(koffi.decode(buf, 'int32', 0))
    r.y = Number(koffi.decode(buf, 'int32', 1))
    r.w = Math.max(1, Number(koffi.decode(buf, 'int32', 2)) - r.x)
    r.h = Math.max(1, Number(koffi.decode(buf, 'int32', 3)) - r.y)
    SetWindowPos(hwnd, HWND_BOTTOM, r.x, r.y, r.w, r.h, 0)
    return true
  } catch {
    return false
  }
}

/** Find the desktop WorkerW window that owns the icon list (SHELLDLL_DefView). */
export function findDesktopWorkerW(): NativeHwnd | null {
  try {
    const progman = FindWindowW('Progman', null)
    if (!progman) return null
    SendMessageW(progman, 0x052c, 0, 0)
    const list = enumerateTopWindows()
    for (const hwnd of list) {
      if (className(hwnd) !== 'WorkerW') continue
      const defView = FindWindowExW(hwnd, null, 'SHELLDLL_DefView', null)
      if (defView) return hwnd
    }
    return null
  } catch {
    return null
  }
}

/** Reparent hwnd into the desktop worker (becomes a real wallpaper behind icons). */
export function embedIntoDesktop(hwnd: NativeHwnd): boolean {
  const worker = findDesktopWorkerW()
  if (!worker) return false
  try {
    ShowWindow(hwnd, SW_HIDE)
    SetParent(hwnd, worker)
    SetWindowPos(hwnd, null, 0, 0, 1, 1, SWP_NOZORDER | SWP_NOACTIVATE)
    return true
  } catch {
    return false
  }
}

/** Move an already-embedded wallpaper to fill the desktop worker area and show it. */
export function layoutToDesktop(hwnd: NativeHwnd): boolean {
  try {
    const worker = findDesktopWorkerW()
    if (!worker) return false
    const buf = koffi.alloc('int32', 4)
    GetClientRect(worker, buf)
    const w = Math.max(1, Number(koffi.decode(buf, 'int32', 2)))
    const h = Math.max(1, Number(koffi.decode(buf, 'int32', 3)))
    MoveWindow(hwnd, 0, 0, w, h, 1)
    ShowWindow(hwnd, SW_SHOWNOACTIVATE)
    return true
  } catch {
    return false
  }
}