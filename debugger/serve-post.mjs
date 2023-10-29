import z from 'zod'
import {
  getRemoteResourceParamsSchema,
  remoteResourceRefSchema,
  updateResourceParamsSchema,
} from './schema/__generated__/schema.parsers.mjs'
import invariant from 'tiny-invariant'

/**
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessageResponse} MessageResponse
 * @typedef {import('@duckduckgo/content-scope-scripts/packages/messaging/index.js').MessageEvent} MessageEvent
 * @typedef {import('./schema/__generated__/schema.types').RemoteResource} RemoteResource
 * @typedef {import('./schema/__generated__/schema.types').RemoteResourceRef} RemoteResourceRef
 * @typedef {import('./schema/__generated__/schema.types').GetFeaturesResponse} GetFeaturesResponse
 * @typedef {import('./schema/__generated__/schema.types').GetRemoteResourceParams} GetRemoteResourceParams
 * @typedef {import('./schema/__generated__/schema.types').UpdateResourceParams} UpdateResourceParams
 */

export const requestSchema = z.discriminatedUnion('method', [
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

export class HttpBackend {
  /**
   * @param {object} params
   * @param {Manifest} params.manifest
   */
  constructor(params) {
    this.remoteResourceRefs = params.manifest.remoteResourceRefs
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
  intoResponse(res, msg, response) {
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
   * @param {string} [text] - optional override text
   * @return {Promise<{value: RemoteResource} | { error: {message:  string} }>}
   */
  async getRemoteResource(params, text) {
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
    console.log(url)
    let content
    try {
      const response = await fetch(url)
      if (response.ok) {
        content = await response.text()
      } else {
        return { error: { message: 'fetch for ' + url + ' failed' } }
      }
    } catch (e) {
      console.error(e)
      // @ts-ignore
      return { error: { message: e.message } }
    }

    invariant(typeof content === 'string', 'must be a string here')

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
      case 'privacy-configuration':
      case 'tds':
        return 'application/json'
      case 'text':
        return 'text/plain'
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
    const contentType = this._contentType(ref)

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

/**
 * @typedef {import("zod").infer<typeof manifestParser>} Manifest
 */

const manifestParser = z.object({
  remoteResourceRefs: z.record(remoteResourceRefSchema),
})

/**
 * @param {object} params
 * @param {number} params.port
 * @param {unknown} params.input
 * @return {Manifest}
 */
export function createManifest({ port, input }) {
  const manifest = manifestParser.parse(input)
  for (let [id, entry] of Object.entries(manifest.remoteResourceRefs)) {
    if (entry.url.startsWith('/')) {
      const next = new URL(entry.url, 'http://127.0.0.1')
      next.port = String(port)
      entry.url = next.toString()
    }
  }
  return manifest
}
