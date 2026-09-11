import { ChildProcess, spawn } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { MediaSnapshot } from '../src/types'

const OUT_PATH = join(tmpdir(), 'quik-media.json')
const SCRIPT_PATH = join(tmpdir(), 'quik-media-daemon.ps1')
const PID_PATH = join(tmpdir(), 'quik-media.pid')

const PS_DAEMON = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

Add-Type -AssemblyName System.Runtime.WindowsRuntime

function Invoke-Async([object]$op, [type]$t) {
  $gm = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' -and $_.IsGenericMethodDefinition
  } | Select-Object -First 1)
  return $gm.MakeGenericMethod($t).Invoke($null, @($op))
}

$mgrType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]

while ($true) {
  try {
    $mgr = (Invoke-Async ($mgrType::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])).Result
    while ($true) {
      try {
        $sess = $mgr.GetCurrentSession()
        if ($null -eq $sess) {
          Set-Content -Path $env:QUIK_MEDIA_OUT -Value 'null' -Encoding UTF8
          Start-Sleep -Milliseconds 1300
          continue
        }
        $props = (Invoke-Async ($sess.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])).Result
        $pb = $sess.GetPlaybackInfo()
        $tl = $sess.GetTimelineProperties()
        $status = [int]$pb.PlaybackStatus
        $pos = [int][math]::Floor($tl.Position.TotalSeconds)
        $dur = [int][math]::Floor($tl.Duration.TotalSeconds)
        $obj = [pscustomobject]@{
          title  = [string]$props.Title
          artist = [string]$props.Artist
          status = $status
          pos    = $pos
          dur    = $dur
          app    = [string]$sess.SourceAppUserModelId
        }
        Set-Content -Path $env:QUIK_MEDIA_OUT -Value ($obj | ConvertTo-Json -Compress) -Encoding UTF8
      } catch {
        Set-Content -Path $env:QUIK_MEDIA_OUT -Value 'err' -Encoding UTF8
      }
      Start-Sleep -Milliseconds 1300
    }
  } catch {
    Set-Content -Path $env:QUIK_MEDIA_OUT -Value 'err' -Encoding UTF8
    Start-Sleep -Milliseconds 2000
  }
}
`

let proc: ChildProcess | null = null

function ensureScript(): void {
  try {
    if (readFileSync(SCRIPT_PATH, 'utf8') !== PS_DAEMON) writeFileSync(SCRIPT_PATH, PS_DAEMON, 'utf8')
  } catch {
    try {
      writeFileSync(SCRIPT_PATH, PS_DAEMON, 'utf8')
    } catch {}
  }
}

function killPidFileStale(): void {
  try {
    const pid = parseInt(readFileSync(PID_PATH, 'utf8'), 10)
    if (!pid || pid === process.pid) return
    try {
      const child = spawn('taskkill', ['/PID', String(pid), '/F'], { windowsHide: true, stdio: 'ignore' })
      child.on('error', () => {})
    } catch {}
  } catch {}
}

export function startMediaDaemon(log?: (msg: string) => void): void {
  if (proc) return
  ensureScript()
  killPidFileStale()
  try {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', SCRIPT_PATH],
      { windowsHide: true, env: { ...process.env, QUIK_MEDIA_OUT: OUT_PATH }, stdio: 'ignore' }
    )
    child.on('exit', () => {
      if (proc === child) proc = null
      try {
        if (readFileSync(PID_PATH, 'utf8') === String(child.pid)) writeFileSync(PID_PATH, '')
      } catch {}
    })
    child.on('error', () => {
      if (proc === child) proc = null
    })
    proc = child
    try {
      writeFileSync(PID_PATH, String(child.pid), 'utf8')
    } catch {}
    log?.('media-daemon-started')
  } catch {
    log?.('media-daemon-spawn-failed')
  }
}

export function stopMediaDaemon(): void {
  if (proc) {
    try {
      proc.kill()
    } catch {}
    proc = null
  }
}

function parse(buf: string): MediaSnapshot | null {
  const t = (buf || '').trim()
  if (!t || t === 'null' || t === 'err') return null
  try {
    const j = JSON.parse(t)
    const status = j.status === 4 ? 'playing' : j.status === 5 ? 'paused' : j.status === 3 ? 'stopped' : 'none'
    return {
      title: String(j.title ?? ''),
      artist: String(j.artist ?? ''),
      status,
      pos: Number(j.pos) || 0,
      dur: Number(j.dur) || 0,
      app: String(j.app ?? '')
    }
  } catch {
    return null
  }
}

export function readMediaSnapshot(): MediaSnapshot | null {
  try {
    return parse(readFileSync(OUT_PATH, 'utf8'))
  } catch {
    return null
  }
}