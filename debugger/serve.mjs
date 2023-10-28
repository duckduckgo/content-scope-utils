import { create } from 'browser-sync'
import express from 'express'
import z from 'zod'
import { getRemoteResourceParamsSchema, updateResourceParamsSchema } from './schema/__generated__/schema.parsers.mjs'

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessageResponse} MessageResponse
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessageEvent} MessageEvent
 * @typedef {import('./schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('./schema/__generated__/schema.types').RemoteResourceRef} RemoteResourceRef
 * @typedef {import('./schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('./schema/__generated__/schema.types').GetRemoteResourceParams} GetRemoteResourceParams
 * @typedef {import('./schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

const bs = create()
const router = express.Router()
const app = express()

const requestSchema = z.discriminatedUnion('method', [
  z.object({
    context: z.literal('specialPages'),
    featureName: z.literal('debugToolsPage'),
    method: z.literal('getFeatures'),
    id: z.string(),
  }),
  z.object({
    context: z.literal('specialPages'),
    featureName: z.literal('debugToolsPage'),
    method: z.literal('getRemoteResource'),
    id: z.string(),
    params: getRemoteResourceParamsSchema,
  }),
  z.object({
    context: z.literal('specialPages'),
    featureName: z.literal('debugToolsPage'),
    method: z.literal('updateResource'),
    id: z.string(),
    params: updateResourceParamsSchema,
  }),
])

class HttpBackend {
  /**
   * @param {object} params
   * @param {Readonly<Record<string, RemoteResourceRef>>} params.remoteResourceRefs
   */
  constructor(params) {
    this.remoteResourceRefs = params.remoteResourceRefs
    /** @type {Record<string, RemoteResource>} */
    this.remoteResources = {}
  }

  /**
   * @returns {Promise<{ value: GetFeaturesResponse } | { error: { message: string }}>}
   */
  async getFeatures() {
    /** @type {import('./schema/__generated__/schema.types').GetFeaturesResponse} */
    const response = {
      features: {
        remoteResources: {
          resources: Object.values(this.remoteResourceRefs),
        },
      },
    }
    return { value: response }
  }

  /**
   * @param {import("express").Response} res
   * @param {MessageEvent} msg
   * @param {{value: any} | {error: {message: string}}} response
   * @return {MessageResponse}
   */
  responseTo(res, msg, response) {
    if ('value' in response) {
      /** @type {MessageResponse} */
      const messageResponse = {
        context: msg.context,
        featureName: msg.featureName,
        result: response.value,
        id: msg.id,
      }
      return res.json(messageResponse)
    }
    return res.status(404).send(response.error.message)
  }

  /**
   * @param {GetRemoteResourceParams} params
   * @return {Promise<{value: RemoteResource} | { error: {message:  string} }>}
   */
  async getRemoteResource(params) {
    if (!(params.id in this.remoteResourceRefs)) return { error: { message: `resource not supported ${params.id}` } }

    // just return the value, don't store it
    if (params.original) {
      return await this._fetchRemote(params)
    }

    // use stored if available...
    if (this.remoteResources[params.id]) {
      return { value: this.remoteResources[params.id] }
    }

    // now fetch the asset
    const next = await this._fetchRemote(params)

    if ('value' in next) {
      this.remoteResources[params.id] = next.value
      return next
    }

    return { error: { message: next.error.message } }
  }

  /**
   * @param {GetRemoteResourceParams} params
   * @return {Promise<{value: RemoteResource} | { error: {message:  string} }>}
   */
  async _fetchRemote(params) {
    const ref = this.remoteResourceRefs[params.id]
    const url = ref.url
    const content = await fetch(url).then((r) => r.text())
    const now = new Date()
    const formattedDate = now.toISOString()

    const resource = {
      ...ref,
      current: {
        source: {
          remote: { url: url, fetchedAt: formattedDate },
        },
        contentType: this._contentType(ref),
        contents: content,
      },
    }
    return { value: resource }
  }

  /**
   * @param {RemoteResourceRef} resourceRef
   * @return {string}
   */
  _contentType(resourceRef) {
    switch (resourceRef.kind) {
      case "privacy-configuration":
      case "tds":
        return "application/json"
      case "text":
        return "text/plain"
    }
  }

  /**
   * @param {UpdateResourceParams} params
   * @return {Promise<{value: RemoteResource} | { error: {message:  string} }>}
   */
  async updateResource(params) {
    if (!(params.id in this.remoteResourceRefs))
      return { error: { message: 'resource not supported for updateResource' } }

    const now = new Date()
    const formattedDate = now.toISOString()

    const ref = this.remoteResourceRefs[params.id]
    const contentType = this._contentType(ref);

    if ('debugTools' in params.source) {
      this.remoteResources[params.id] = {
        ...ref,
        current: {
          source: {
            debugTools: { modifiedAt: formattedDate },
          },
          contents: params.source.debugTools.content,
          contentType,
        },
      }

      return this.getRemoteResource({ id: params.id })
    }

    if ('remote' in params.source) {
      const content = await fetch(params.source.remote.url).then((r) => r.text())
      this.remoteResources[params.id] = {
        ...ref,
        current: {
          source: {
            remote: { url: params.source.remote.url, fetchedAt: formattedDate },
          },
          contents: content,
          contentType,
        },
      }
      return this.getRemoteResource({ id: params.id })
    }
    return { error: { message: 'unreachable' } }
  }
}

const http = new HttpBackend({
  remoteResourceRefs: {
    'privacy-configuration': {
      id: 'privacy-configuration',
      kind: 'privacy-configuration',
      url: 'https://staticcdn.duckduckgo.com/trackerblocking/config/v3/android-config.json',
      name: 'Privacy Config',
    },
    tds: {
      id: 'tds',
      kind: 'tds',
      url: 'https://staticcdn.duckduckgo.com/trackerblocking/v4/tds.json',
      name: 'Tracker Data Set',
    },
    'tds-next': {
      id: 'tds-next',
      kind: 'tds',
      url: 'https://staticcdn.duckduckgo.com/trackerblocking/v4/tds-next.json',
      name: 'Tracker Data Set (NEXT)',
    },
    'android-tds': {
      id: 'android-tds',
      kind: 'tds',
      url: 'https://staticcdn.duckduckgo.com/trackerblocking/appTP/2.1/android-tds.json',
      name: 'Android TDS'
    },
    'android-surrogates': {
      id: 'android-surrogates',
      kind: 'text',
      url: 'https://staticcdn.duckduckgo.com/surrogates.txt',
      name: 'Android Surrogates'
    }
  },
})

router.post('/specialPages/debugToolsPage', async function (req, res) {
  const parsed = requestSchema.safeParse(req.body)
  if (parsed.success) {
    const msg = parsed.data
    if (msg.method === 'getFeatures') {
      const response = await http.getFeatures()
      return http.responseTo(res, msg, response)
    }
    if (msg.method === 'getRemoteResource') {
      const response = await http.getRemoteResource(msg.params)
      return http.responseTo(res, msg, response)
    }
    if (msg.method === 'updateResource') {
      const response = await http.updateResource(msg.params)
      return http.responseTo(res, msg, response)
    }
  }
  res.status(500).send(`unhandled request: ${JSON.stringify(req.body)}`)
})

router.get('/rr/:id', async function (req, res) {
  console.log(`FETCH [get] /rr/${req.params.id}`)
  const v = await http.getRemoteResource({ id: req.params.id })
  if ('value' in v) {
    // todo: support all content types here
    const resource = v.value;
    switch (resource.kind) {
      case "privacy-configuration":
      case "tds":
        const parsed = JSON.parse(v.value.current.contents)
        return res.header('content-type', 'application/json').send(JSON.stringify(parsed, null, 4))
      case "text":
        return res.header('content-type', 'text/plain').send(v.value.current.contents)
    }
  } else {
    return res.status(500).send(v.error.message)
  }
  return res.status(404).send(`not found, resource ID: ${req.params.id}`)
})

app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))
app.use(router)

bs.init(
  {
    server: 'dist',
    watch: false,
    open: false,
    middleware: [app],
  },
  (e, bs) => {
    console.log('Available on ' + bs.options.getIn(['urls', 'local']))
  },
)
