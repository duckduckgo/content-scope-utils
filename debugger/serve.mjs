import express from 'express'
import { createManifest, HttpBackend, requestSchema } from './serve-post.mjs'
import z from 'zod'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { ready, signals } from './common.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessageResponse} MessageResponse
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessageEvent} MessageEvent
 * @typedef {import('./schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('./schema/__generated__/schema.types').RemoteResourceRef} RemoteResourceRef
 * @typedef {import('./schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('./schema/__generated__/schema.types').GetRemoteResourceParams} GetRemoteResourceParams
 * @typedef {import('./schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */
const router = express.Router()
const app = express()

// handle CLI input
const options = {
  port: {
    type: 'string',
    short: 'p',
  },
  config: {
    type: 'string',
    short: 'c',
    default: 'config/integration.json',
  },
}
// @ts-ignore
const { values } = parseArgs({ args: process.argv.slice(2), options })
console.log(values)
const cliSchema = z.object({
  port: z.string().optional(),
  config: z.string(),
})
const cli = cliSchema.parse(values)

app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))
app.use(router)
app.use(express.static('dist'))

// @ts-expect-error - TS can't handle that this can be empty or a string or number
const server = app.listen(cli.port, '0.0.0.0', () => {
  const { address, addresses } = ready(server)
  routerSetup(address)

  for (let address of addresses) {
    const url = new URL(address)
    url.hash = '/remoteResources'
    url.searchParams.set('transport', 'http')
    console.log('Available on:', url.href)
  }
})

/**
 * @param {import("net").AddressInfo} address
 */
function routerSetup(address) {
  const json = JSON.parse(readFileSync(join(__dirname, cli.config), 'utf8'))
  const manifest = createManifest({ port: address.port, input: json })
  const http = new HttpBackend({ manifest, port: address.port })

  router.post('/specialPages/debugToolsPage', async function (req, res) {
    const parsed = requestSchema.safeParse(req.body)
    if (parsed.success) {
      const msg = parsed.data
      if (msg.method === 'getFeatures') {
        const response = await http.getFeatures()
        return http.intoResponse(res, msg, response)
      }
      if (msg.method === 'getRemoteResource') {
        const response = await http.getRemoteResource(msg.params)
        return http.intoResponse(res, msg, response)
      }
      if (msg.method === 'updateResource') {
        const response = await http.updateResource(msg.params)
        return http.intoResponse(res, msg, response)
      }
    }
    res.status(500).send(`unhandled request: ${JSON.stringify(req.body)}`)
  })

  router.get('/rr/:id', async function (req, res) {
    console.log(`FETCH [get] /rr/${req.params.id}`)
    const v = await http.getRemoteResource({ id: req.params.id })
    if ('value' in v) {
      // todo: support all content types here
      const resource = v.value
      switch (resource.kind) {
        case 'privacy-configuration':
        case 'tds':
          const parsed = JSON.parse(v.value.current.contents)
          return res.header('content-type', 'application/json').send(JSON.stringify(parsed, null, 4))
        case 'text':
          return res.header('content-type', 'text/plain').send(v.value.current.contents)
      }
    } else {
      return res.status(500).send(v.error.message)
    }
    return res.status(404).send(`not found, resource ID: ${req.params.id}`)
  })
  console.log(server.address())
}

signals()
