import { app, Notification } from 'electron'
import https from 'https'
import { readFileSync, writeFileSync, unlinkSync, createWriteStream, accessSync, constants } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import type { UpdateState } from '../src/types'

interface UpdaterOptions {
  broadcast: (state: UpdateState) => void
  openOverlay: () => void
}

let broadcast: (state: UpdateState) => void = () => {}
let openOverlay: () => void = () => {}
let state: UpdateState = { phase: 'idle' }

let pendingAssetUrl: string | null = null
let pendingVersion: string | null = null

function setState(s: UpdateState): void {
  state = s
  broadcast(s)
}

function notesPath(): string {
  return path.join(app.getPath('userData'), 'quik-update-notes.json')
}

function normalizeNotes(body: string | null | undefined): string {
  if (!body) return ''
  return body
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

function httpsGet(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Quik-Updater' } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const loc = res.headers.location
        if (!loc) { res.resume(); reject(new Error('redirect without location')); return }
        httpsGet(loc).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
  })
}

function showNotification(title: string, body: string): void {
  try {
    if (!Notification.isSupported()) return
    const n = new Notification({ title, body, silent: true })
    n.on('click', () => openOverlay())
    n.show()
  } catch {}
}

function readPendingChangelog(): UpdateState | null {
  try {
    const j = JSON.parse(readFileSync(notesPath(), 'utf8'))
    unlinkSync(notesPath())
    if (j && j.version) {
      return { phase: 'changelog', version: String(j.version), notes: String(j.notes ?? '') }
    }
  } catch {}
  return null
}

export function initUpdater(opts: UpdaterOptions): void {
  broadcast = opts.broadcast
  openOverlay = opts.openOverlay

  const pending = readPendingChangelog()
  if (pending) setState(pending)
}

export function getUpdateState(): UpdateState {
  return state
}

export async function checkForUpdates(): Promise<void> {
  if (!app.isPackaged) {
    setState({ phase: 'not-available', version: app.getVersion() })
    return
  }
  setState({ phase: 'checking' })
  try {
    const buf = await httpsGet('https://api.github.com/repos/salatykk/Quik/releases/latest')
    const release = JSON.parse(buf.toString('utf8'))
    const remoteVersion = String(release.tag_name ?? '').replace(/^v/, '')
    const currentVersion = app.getVersion()

    if (!remoteVersion || compareVersions(remoteVersion, currentVersion) <= 0) {
      setState({ phase: 'not-available', version: currentVersion })
      return
    }

    const assets: any[] = release.assets ?? []
    const asset = assets.find((a: any) => /Quik-Setup-.*\.exe$/i.test(a.name))
    if (!asset) {
      setState({ phase: 'error', version: remoteVersion, message: 'Файл установщика не найден в релизе' })
      return
    }

    pendingAssetUrl = asset.browser_download_url
    pendingVersion = remoteVersion
    const notes = normalizeNotes(release.body)
    setState({ phase: 'available', version: remoteVersion, notes })

    if (!notified) {
      notified = true
      showNotification(
        `Доступна версия Quik ${remoteVersion}`,
        'Откройте Quik, чтобы посмотреть, что нового'
      )
    }
  } catch {
    setState({ phase: 'error', message: 'Не удалось проверить обновления' })
  }
}

let notified = false

export async function downloadUpdate(): Promise<void> {
  if (!pendingAssetUrl || !pendingVersion) {
    setState({ phase: 'error', message: 'Нет данных для загрузки' })
    return
  }

  const version = pendingVersion
  const url = pendingAssetUrl
  const assetName = `Quik-Setup-${version}.exe`

  const exeDir = path.dirname(app.getPath('exe'))
  let targetDir = exeDir
  try {
    accessSync(exeDir, constants.W_OK)
  } catch {
    targetDir = app.getPath('temp')
  }
  const targetPath = path.join(targetDir, assetName)

  setState({ phase: 'downloading', version, percent: 0 })

  try {
    const req = https.get(url, { headers: { 'User-Agent': 'Quik-Updater' } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const loc = res.headers.location
        if (!loc) { res.resume(); setState({ phase: 'error', version, message: 'Ошибка перенаправления' }); return }
        downloadTo(loc, targetPath, version)
        return
      }
      if (res.statusCode !== 200) {
        res.resume()
        setState({ phase: 'error', version, message: `Ошибка HTTP ${res.statusCode}` })
        return
      }
      streamDownload(res, targetPath, version)
    })
    req.on('error', () => {
      setState({ phase: 'error', version, message: 'Ошибка сети' })
    })
  } catch {
    setState({ phase: 'error', version, message: 'Не удалось скачать обновление' })
  }
}

function downloadTo(url: string, targetPath: string, version: string): void {
  const req = https.get(url, { headers: { 'User-Agent': 'Quik-Updater' } }, res => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      const loc = res.headers.location
      if (!loc) { res.resume(); setState({ phase: 'error', version, message: 'Ошибка перенаправления' }); return }
      downloadTo(loc, targetPath, version)
      return
    }
    if (res.statusCode !== 200) {
      res.resume()
      setState({ phase: 'error', version, message: `Ошибка HTTP ${res.statusCode}` })
      return
    }
    streamDownload(res, targetPath, version)
  })
  req.on('error', () => {
    setState({ phase: 'error', version, message: 'Ошибка сети' })
  })
}

function streamDownload(res: any, targetPath: string, version: string): void {
  const total = Number(res.headers['content-length'] || '0')
  let downloaded = 0
  const file = createWriteStream(targetPath)

  res.pipe(file)

  res.on('data', (chunk: Buffer) => {
    downloaded += chunk.length
    if (total > 0) {
      const percent = Math.round((downloaded / total) * 100)
      setState({ phase: 'downloading', version, percent })
    }
  })

  file.on('finish', () => {
    file.close(() => {
      try {
        writeFileSync(notesPath(), JSON.stringify({ version, notes: state.notes ?? '' }), 'utf8')
      } catch {}

      setState({ phase: 'downloaded', version })

      setTimeout(() => {
        try {
          spawn(targetPath, [], { detached: true, stdio: 'ignore', windowsHide: false }).unref()
        } catch {}
        app.quit()
      }, 1000)
    })
  })

  file.on('error', () => {
    setState({ phase: 'error', version, message: 'Ошибка записи файла' })
  })

  res.on('error', () => {
    setState({ phase: 'error', version, message: 'Ошибка загрузки' })
  })
}