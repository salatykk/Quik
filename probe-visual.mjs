import * as koffi from 'koffi'
const user32 = koffi.load('user32.dll')
const ker = koffi.load('kernel32.dll')
const H = koffi.pointer('HANDLE_t', 'void')
const IsWindowVisible = user32.func('__stdcall', 'IsWindowVisible', 'int', [H])
const GetWindowThreadProcessId = user32.func('__stdcall', 'GetWindowThreadProcessId', 'uint32', [H, 'void *'])
const GetWindowRect = user32.func('__stdcall', 'GetWindowRect', 'int', [H, 'void *'])
const GetParent = user32.func('__stdcall', 'GetParent', H, [H])
const GetWindowLongPtrW = user32.func('__stdcall', 'GetWindowLongPtrW', 'int64', [H, 'int'])
const GetWindowTextW = user32.func('__stdcall', 'GetWindowTextW', 'int', [H, 'void *', 'int'])
const EnumWindowsProc = koffi.proto('EnumWindowsProc', 'int', [H, 'intptr'])
const EnumWindows = user32.func('__stdcall', 'EnumWindows', 'int', [koffi.pointer(EnumWindowsProc), 'intptr'])
const OpenProcess = ker.func('__stdcall', 'OpenProcess', H, ['uint32', 'int', 'uint32'])
const QueryFullProcessImageNameW = ker.func('__stdcall', 'QueryFullProcessImageNameW', 'int', [H, 'uint32', 'void *', 'void *'])
const CloseHandle = ker.func('__stdcall', 'CloseHandle', 'int', [H])
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000

function enumerate() { const l = []; EnumWindows((h) => { l.push(h); return 1 }, 0); return l }
function vis(h) { try { return IsWindowVisible(h) !== 0 } catch { return false } }
function pidOf(h) { const b = koffi.alloc('uint32', 1); GetWindowThreadProcessId(h, b); return koffi.decode(b, 'uint32') }
function rectOf(h) {
  const b = koffi.alloc('int', 4)
  try {
    const ok = GetWindowRect(h, b)
    if (!ok) return null
    const [l, t, r, bot] = koffi.decode(b, ['int', 4])
    return { l, t, r, b: bot, w: r - l, h: bot - t }
  } catch { return null }
}
function titleOf(h) {
  try {
    const buf = Buffer.alloc(1024)
    const n = GetWindowTextW(h, buf, 512)
    if (!n) return ''
    let s = ''
    for (let i = 0; i < n; i++) s += String.fromCharCode(buf.readUInt16LE(i * 2))
    return s
  } catch { return '' }
}
function styleOf(h) { try { return Number(GetWindowLongPtrW(h, -16)) } catch { return 0 } }
const WS_CHILD = 0x40000000, WS_POPUP = 0x80000000
function imgOf(pid) {
  const proc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid)
  if (!proc) return null
  try {
    const buf = Buffer.alloc(32768)
    const size = koffi.alloc('uint32', 1)
    koffi.encode(size, 'uint32', 16384)
    if (!QueryFullProcessImageNameW(proc, 0, buf, size)) return null
    const n = koffi.decode(size, 'uint32')
    let s = ''
    for (let i = 0; i < n && i < 32768; i++) s += String.fromCharCode(buf.readUInt16LE(i * 2))
    return s.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? null
  } finally { CloseHandle(proc) }
}

const wins = enumerate()
const byPid = new Map()
for (const h of wins) {
  const pid = pidOf(h)
  if (!byPid.has(pid)) byPid.set(pid, [])
  byPid.get(pid).push(h)
}

// find overlay window: image electron.exe, title 'Quik', visible, biggest
let overlay = null
for (const [pid, list] of byPid) {
  if (imgOf(pid) !== 'electron.exe') continue
  for (const h of list) {
    if (!vis(h)) continue
    const title = titleOf(h)
    const rect = rectOf(h)
    if (!title.includes('Quik') || !rect || rect.w < 1000) continue
    if (!overlay || rect.w * rect.h > overlay.rect.w * overlay.rect.h) overlay = { h, pid, rect, title }
  }
}
console.log('OVERLAY:', overlay ? `hwnd=${String(overlay.h)} pid=${overlay.pid} rect=[${overlay.rect.l},${overlay.rect.t} ${overlay.rect.w}x${overlay.rect.h}] title="${overlay.title}"` : 'none')

// TG windows: image telegram.exe
for (const [pid, list] of byPid) {
  const img = imgOf(pid)
  if (img !== 'telegram.exe') continue
  for (const h of list) {
    const st = styleOf(h)
    const par = GetParent(h)
    let parBox = ''
    if (par && overlay && String(par) === String(overlay.h)) parBox = ' << PARENT=OVERLAY'
    else if (par) parBox = ` parent=${String(par)}`
    const rect = rectOf(h)
    const rectS = rect ? `[${rect.l},${rect.t} ${rect.w}x${rect.h}]` : 'no-rect'
    console.log(`TG pid=${pid} child=${(st & WS_CHILD) !== 0} popup=${(st & WS_POPUP) !== 0} vis=${vis(h)} rect=${rectS} style=0x${(st >>> 0).toString(16)} title="${titleOf(h).slice(0, 30)}"${parBox}`)
  }
  console.log('---')
}
process.exit(0)