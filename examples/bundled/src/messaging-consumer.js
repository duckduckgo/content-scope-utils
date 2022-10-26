import { Messaging, WebkitMessagingConfig } from '@duckduckgo/content-scope-utils/lib/messaging.js'

// Create the webkit options
const obj = new URLSearchParams(window.location.search)
const injected = obj.get('injected')

let opts
if (injected) {
  const json = JSON.parse(injected)
  opts = new WebkitMessagingConfig(json)
} else {
  opts = new WebkitMessagingConfig({
    secret: 'hello-world',
    webkitMessageHandlerNames: ['foo', ''],
    hasModernWebkitAPI: false,
  })
}

console.log('running with ▶️', JSON.stringify(opts, null, 2))
const messaging = new Messaging(opts)

try {
  messaging.notify('foo', { bar: 'baz' })
} catch (e) {
  append(['error', e.message])
}
messaging
  .request('getData', { bar: 'baz' })
  .then((resp) => {
    append(['getData', resp])
  })
  .catch((e) => {
    append(['error', e.message])
  })

function append(data) {
  const results = document.querySelector('#results')
  if (results) {
    const nextCode = document.createElement('code')
    nextCode.style.display = 'block'
    nextCode.innerText = JSON.stringify(data)
    results.appendChild(nextCode)
  }
}
