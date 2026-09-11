import http from 'http'
import WebSocket from 'ws'

const list = await new Promise((res, rej) => {
  http.get('http://127.0.0.1:9591/json/list', r => {
    let d = ''
    r.on('data', c => d += c)
    r.on('end', () => res(JSON.parse(d)))
  }).on('error', rej)
})

for (const t of list.filter(t => t.type === 'page' && t.url.includes('#widget/'))) {
  const ws = new WebSocket(t.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j) })
  const expr = `JSON.stringify({
    hash: location.hash,
    quik: !!window.quik,
    app: window.quik ? Object.keys(window.quik).sort().join(',') : 'NONE',
    card: !!document.querySelector('.card'),
    wcard: !!document.querySelector('.w-card'),
    content: [...document.querySelectorAll('.w-content')].map(el => el.className),
    txtLen: document.body ? document.body.innerText.length : -1,
    bodyHtml: document.body ? document.body.innerHTML.length : -1
  })`
  let s = 0
  const r = await new Promise((resolve, reject) => {
    ws.on('message', m => {
      const data = JSON.parse(m.toString())
      if (data.id === 1) { clearTimeout(tm); resolve(data.result) }
    })
    const tm = setTimeout(() => reject(new Error('timeout')), 5000)
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }))
  })
  console.log(t.url.split('#')[1] + ' -> ' + JSON.stringify(r.result && r.result.value))
  ws.close()
}
process.exit(0)