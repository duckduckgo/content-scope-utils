import { assign, createMachine, forwardTo, pure, raise, send, sendTo } from 'xstate'
import { remoteResourceSchema } from '../../../schema/__generated__/schema.parsers.mjs'
import * as z from 'zod'
import { DebugToolsMessages } from '../DebugToolsMessages.mjs'
import invariant from 'tiny-invariant'
import { UpdateVersion } from '../transforms/update-version'
import { UpdateFeatureHash } from '../transforms/feature-hash'
import { handler2 } from '../transforms'
import { ToggleFeature } from '../transforms/toggle-feature'

/**
 * @typedef {import("./remote-resources.machine.types").RemoteResourcesBroadcastEvents} RemoteResourcesBroadcastEvents
 */

/** @type {Record<string, {editorKinds: EditorKind[]}>} */
const resourceCapabilities = {
  'privacy-configuration': {
    editorKinds: ['toggles', 'inline', 'diff', 'trackers', 'patches'],
  },
  default: {
    editorKinds: ['inline', 'diff'],
  },
}

const _remoteResourcesMachine = createMachine({
  id: 'remote resources machine',
  initial: 'loading resource',
  context: /** @type {import("./remote-resources.machine.types").RemoteResourcesCtx} */ ({}),
  schema: {
    events: /** @type {import("./remote-resources.machine.types").RemoteResourcesEvents} */ ({}),
  },
  states: {
    'loading resource': {
      description: 'this will try to read from the incoming data',
      invoke: {
        src: 'loadResources',
        id: 'loadResources',
        onDone: [
          {
            target: 'showing editor',
            actions: [
              'assignResources',
              'assignCurrentResource',
              'broadcastResourceSelected',
              'assignEditorKind',
              'assignCurrentDomain',
              'raiseUpdated',
            ],
          },
        ],
        onError: [
          {
            target: 'invalid resource',
            actions: ['serviceError'],
          },
        ],
      },
    },
    'showing editor': {
      id: 'showing editor',
      type: 'parallel',
      invoke: [
        {
          src: 'nav-listener',
          id: 'nav-listener',
        },
        {
          src: 'tab-listener',
          id: 'tab-listener',
        },
        {
          src: 'transform-listener',
          id: 'transform-listener',
        },
      ],
      on: {
        nav_resource: {
          actions: ['assignCurrentResource', 'broadcastResourceSelected', 'assignEditorKind', 'assignCurrentDomain'],
        },
        nav_other: {
          actions: ['assignCurrentResource', 'broadcastResourceSelected', 'assignEditorKind', 'assignCurrentDomain'],
        },
        tabs_received: {
          actions: ['assignTabs'],
        },
      },
      states: {
        urlEditor: {
          initial: 'closed',
          states: {
            closed: {},
            open: {},
          },
          on: {
            'show url editor': { target: '.open' },
            'hide url editor': { target: '.closed' },
          },
        },
        errors: {
          initial: 'none',
          states: {
            none: {},
            some: {},
          },
          on: {
            error: {
              target: '.some',
            },
            clearErrors: {
              target: '.none',
            },
          },
        },
        contentErrors: {
          initial: 'none',
          states: { none: {}, some: {} },
          on: {
            'content is invalid': {
              target: '.some',
              actions: ['assignContentMarkers'],
            },
            'content is valid': {
              target: '.none',
              actions: ['removeContentMarkers'],
            },
          },
        },
        originalDiff: {
          initial: 'idle',
          id: 'originalDiff',
          on: {
            'show original diff': {
              actions: ['pushToRoute'],
            },
            'close original diff': {
              actions: ['pushToRoute'],
            },
          },
          states: {
            idle: {
              always: [{ cond: 'hasOriginalDiffParam', target: 'fetching' }],
            },
            fetching: {
              invoke: {
                src: 'fetchOriginal',
                id: 'fetchOriginal',
                onDone: { actions: 'assignOriginalResource', target: 'showing' },
              },
            },
            showing: {
              on: { nav_resource: 'idle' },
            },
          },
        },
        editing: {
          initial: 'editor has original content',
          on: {
            'set editor kind': {
              actions: ['pushToRoute'],
            },
            'set current domain': {
              actions: ['pushToRoute'],
            },
            'clear current domain': {
              actions: ['pushToRoute'],
            },
            'RemoteResource.setRemoteUrl': { target: '.saving new remote' },

            // privacy config mods
            'PrivacyConfig.toggleFeature': { actions: 'forwardToTransformer' },
            'PrivacyConfig.toggleFeatureDomain': { actions: 'forwardToTransformer' },
            'PrivacyConfig.toggleAllowlistedTracker': { actions: 'forwardToTransformer' },

            // other
            'set current resource content': {
              actions: ['assignCurrentContent', 'markEdited'],
            },
          },
          states: {
            'editor has original content': {
              on: {
                'content was edited': {
                  target: 'editor has edited content',
                },
              },
            },
            'editor has edited content': {
              on: {
                'RemoteResource.setDebugContent': [
                  {
                    cond: 'editor has valid content',
                    target: 'saving edited',
                  },
                ],
                'content was reverted': {
                  target: 'editor has original content',
                },
              },
            },
            'saving new remote': {
              invoke: {
                src: 'saveNewRemote',
                id: 'saveNewRemote',
                onDone: [
                  {
                    target: 'editor has original content',
                    actions: ['updateCurrentResource', 'assignCurrentResource', 'clearErrors', 'raiseUpdated'],
                  },
                ],
                onError: [
                  {
                    target: 'editor has edited content',
                    actions: ['serviceError'],
                  },
                ],
              },
            },
            'saving edited': {
              description: 'save a resource with content from the editor',
              invoke: {
                src: 'saveEdited',
                id: 'saveEdited',
                onDone: [
                  {
                    target: 'editor has original content',
                    actions: [
                      'broadcastPreUpdate',
                      'updateCurrentResource',
                      'assignCurrentResource',
                      'clearErrors',
                      'raiseUpdated',
                      'broadcastPostUpdate',
                    ],
                  },
                ],
                onError: [
                  {
                    target: 'editor has edited content',
                    actions: ['serviceError'],
                  },
                ],
              },
            },
          },
        },
      },
    },
    'invalid resource': {},
  },
  predictableActionArguments: true,
  preserveActionOrder: true,
  strict: true,
})

export const remoteResourcesMachine = _remoteResourcesMachine.withConfig({
  services: {
    fetchOriginal: async (ctx) => {
      return ctx.messages.getRemoteResource({ id: 'privacy-configuration', original: true })
    },
    'nav-listener': (ctx) => (send) => {
      const sub = ctx.parent.subscribe((evt) => {
        if (evt.event.type === 'NAV_INTERNAL') {
          send({ type: 'nav_resource' })
        }
      })
      return () => {
        sub.unsubscribe()
      }
    },
    'tab-listener': (ctx) => (send) => {
      ctx.messages.getTabs().then((params) => {
        send({ type: 'tabs_received', payload: params })
      })
      const unsub = ctx.messages.onTabsUpdated((tabs) => {
        send({ type: 'tabs_received', payload: tabs })
      })
      return () => {
        unsub()
      }
    },
    'transform-listener': () => (send, onReceive) => {
      onReceive(
        async (
          /** @type {Extract<import('./remote-resources.machine.types').RemoteResourcesEvents, {type: 'transform-proxy'}>} */ evt,
        ) => {
          invariant(evt.type === 'transform-proxy', 'must be transform-proxy')
          const parsed = JSON.parse(evt.subject.contents)
          const result = await handler2(parsed, evt.original)
          if (result.ok) {
            const asString = JSON.stringify(result.success, null, 4)
            send({ type: 'set current resource content', payload: asString })
          } else {
            console.log(result.error)
            alert('toggleDomain failed..., check console')
          }
        },
      )
      return () => {
        console.log('teardown of transform-listener')
      }
    },
    // eslint-disable-next-line require-await
    loadResources: async (ctx) => {
      const parsed = z.object({ messages: z.instanceof(DebugToolsMessages) }).parse(ctx)
      const resources = (await parsed.messages.getFeatures()).features.remoteResources.resources
      const jobs = resources.map((r) => parsed.messages.getRemoteResource({ id: r.id }))
      const values = await Promise.all(jobs)
      return values
    },
    // eslint-disable-next-line require-await
    saveNewRemote: async (ctx, evt) => {
      if (evt.type === 'RemoteResource.setRemoteUrl') {
        /** @type {import('../DebugToolsMessages.mjs').UpdateResourceParams} */
        const next = {
          id: evt.id,
          source: { remote: { url: evt.url } },
        }
        const response = await minDuration(ctx.messages.updateResource(next))
        return response
      }
      throw new Error('not supported')
    },
    saveEdited: async (ctx, evt) => {
      invariant(evt.type === 'RemoteResource.setDebugContent')

      const match = ctx.resources?.find((res) => res.id === ctx.currentResource?.id)
      invariant(match, 'must be referring to a local resource')

      // any pre-processing to do?
      let content = evt.content // string

      // apply privacy-configuration pre-processing
      if (evt.id === 'privacy-configuration') {
        const original = JSON.parse(match.current.contents)
        const nextJson = JSON.parse(evt.content)

        // to apply hash, both must conform to basic structure
        try {
          PrivacyConfig.parse(original)
        } catch (e) {
          console.log(e)
          throw new Error('CURRENT json format doesnt conform to privacy config. see console for more info')
        }

        try {
          PrivacyConfig.parse(nextJson)
        } catch (e) {
          console.log(e)
          throw new Error('NEXT json format doesnt conform to privacy config. see console for more info')
        }

        const withHashes = await new UpdateFeatureHash({
          original: original,
        }).transform(nextJson)

        const nextConfig = await new UpdateVersion(Date.now()).transform(withHashes)
        content = JSON.stringify(nextConfig)
      }

      /** @type {import('../DebugToolsMessages.mjs').UpdateResourceParams} */
      const next = {
        id: evt.id,
        source: { debugTools: { content: content } },
      }

      return await minDuration(ctx.messages.updateResource(next))
    },
  },
  actions: {
    markEdited: pure((ctx) => {
      invariant(ctx.currentResource, 'ctx.currentResource must be set here')
      invariant(Array.isArray(ctx.resources), 'ctx.resources must be set here')
      let match = ctx.resources.find((x) => x.id === ctx.currentResource?.id)
      invariant(match, 'ctx.currentResource must match')

      if (ctx.currentResource.lastValue === match.current.contents) {
        return raise({ type: 'content was reverted' })
      }
      return raise({ type: 'content was edited' })
    }),
    forwardToTransformer: pure((ctx, evt) => {
      invariant(ctx.currentResource, 'ctx.currentResource must be set here')

      /** @type {(import('./remote-resources.machine.types').TransformCommands['type'])[] } */
      let supported = [
        'PrivacyConfig.toggleFeature',
        'PrivacyConfig.toggleUnprotected',
        'PrivacyConfig.updateVersion',
        'PrivacyConfig.toggleFeatureDomain',
        'PrivacyConfig.toggleAllowlistedTracker',
      ]

      invariant(supported.includes(/** @type {any} */ (evt.type)), 'must be a supported transform event')

      /** @type {import('./remote-resources.machine.types').RemoteResourcesEvents} */
      const proxy = {
        type: 'transform-proxy',
        original: /** @type {any} */ (evt),
        subject: {
          contents: ctx.currentResource.lastValue,
        },
      }
      return sendTo('transform-listener', proxy)
    }),
    assignCurrentContent: assign({
      currentResource: (ctx, evt) => {
        invariant(ctx.currentResource, 'ctx.currentResource must be set here')
        invariant(evt.type === 'set current resource content', 'only accepting from "set current resource content"')
        // invariant(evt.payload === 'set current resource content', 'only accepting from "set current resource content"')
        return {
          ...ctx.currentResource,
          lastValue: evt.payload,
        }
      },
    }),
    assignContentMarkers: assign({
      contentErrors: (ctx, evt) => {
        if (evt.type === 'content is invalid') {
          return evt.errors
        }
        return []
      },
    }),
    removeContentMarkers: assign({
      contentErrors: () => [],
    }),
    assignOriginalResource: assign({
      originalResources: (ctx, evt) => {
        invariant(evt.type === 'done.invoke.fetchOriginal', 'must be done.invoke.fetchOriginal')
        return {
          ...ctx.originalResources,
          [evt.data.id]: evt.data,
        }
      },
    }),
    assignTabs: assign({
      tabs: (ctx, evt) => {
        if (evt.type === 'tabs_received') {
          /** @type {(import("../types.js").TabWithHostname|null)[] } */
          const withHostname = evt.payload.tabs.map((tab) => {
            try {
              const url = new URL(tab.url)
              return {
                ...tab,
                hostname: url.hostname,
              }
            } catch (e) {
              console.error(e, tab.url)
              return null
            }
          })
          return /** @type {import("../types.js").TabWithHostname[]} */ (withHostname.filter(Boolean))
        }
        return ctx.tabs
      },
    }),
    assignResources: assign({
      resources: (ctx, evt) => {
        const resources = z.array(remoteResourceSchema).parse(/** @type {any} */ (evt).data)
        return resources
      },
    }),
    assignCurrentResource: assign({
      currentResource: (ctx) => {
        // otherwise select the first
        const resources = z.array(remoteResourceSchema).parse(ctx.resources)
        invariant(resources.length > 0, 'must have resources here')
        const parentState = ctx.parent?.state?.context.history.location.pathname
        const id = parentState.split('/')[2] || resources[0].id // default
        const match = resources.find((x) => x.id === id) || resources[0]
        const matchingId = match ? match.id : resources[0].id

        if (!matchingId) throw new Error('unreachable - must have valid resource ID by this point')
        invariant(match)

        // matching, or default
        const capabilties = resourceCapabilities[matchingId] || resourceCapabilities.default

        return {
          id: matchingId,
          editorKinds: capabilties.editorKinds,
          lastValue: ctx.currentResource?.id === matchingId ? ctx.currentResource?.lastValue : match.current.contents,
        }
      },
    }),
    assignEditorKind: assign({
      editorKind: (ctx) => {
        const parentState = ctx.parent?.state?.context
        const search = parentState.search
        const parsed = EditorKind.safeParse(search?.get('editorKind'))
        if (parsed.success) {
          if (ctx.currentResource?.editorKinds.includes(parsed.data)) {
            return parsed.data
          } else {
            console.warn('valid editor kind, but the current resource doesnt support it')
          }
        }
        {
          const parsed = EditorKind.safeParse(ctx.currentResource?.editorKinds[0])
          if (parsed.success) {
            return parsed.data
          }
        }
        return 'inline' // default
      },
    }),
    assignCurrentDomain: assign({
      currentDomain: (ctx) => {
        const parentState = ctx.parent?.state?.context
        const search = parentState.search
        const domain = search?.get('currentDomain')
        return tryCreateDomain(domain)
      },
    }),
    updateCurrentResource: assign({
      resources: (ctx, evt) => {
        // verify incoming payload
        const incomingResourceUpdate = remoteResourceSchema.parse(/** @type {any} */ (evt).data)

        // ensure our local resources are in good condition
        const existingResources = z.array(remoteResourceSchema).parse(ctx.resources)

        // access the currently selected resource, so that we can update the correct item
        const current = CurrentResource.parse(ctx.currentResource)

        // now return a new list, replacing an ID match with the updated content
        return existingResources.map((res) => {
          if (current.id === res.id) {
            return incomingResourceUpdate
          } else {
            return res
          }
        })
      },
    }),
    raiseUpdated: pure(() => {
      return [
        // on any successful save, put the UI back into a 'clean state'
        raise({ type: 'content was reverted' }),
        raise({ type: 'hide url editor' }),
      ]
    }),
    broadcastResourceSelected: pure((ctx) => {
      return (ctx.children || []).map((child) => {
        invariant(ctx.currentResource, 'ctx.currentResource absent')
        /** @type {RemoteResourcesBroadcastEvents} */
        const event = {
          type: 'broadcastResourceSelected',
          payload: {
            currentResource: ctx.currentResource,
          },
        }
        return send(event, { to: child })
      })
    }),
    broadcastPreUpdate: pure((ctx) => {
      return (ctx.children || []).map((child) => {
        invariant(ctx.currentResource, 'ctx.currentResource absent')
        const resource = ctx.resources?.find((r) => r.id === ctx.currentResource?.id)
        if (!resource) throw new Error('unreachable')
        /** @type {RemoteResourcesBroadcastEvents} */
        const evt = {
          type: 'broadcastPreResourceUpdated',
          payload: {
            currentResource: ctx.currentResource,
            resource,
          },
        }
        return send(evt, {
          to: child,
        })
      })
    }),
    broadcastPostUpdate: pure((ctx) => {
      return (ctx.children || []).map((child) => {
        invariant(ctx.currentResource, 'ctx.currentResource absent')
        const resource = ctx.resources?.find((r) => r.id === ctx.currentResource?.id)
        if (!resource) throw new Error('unreachable')
        /** @type {RemoteResourcesBroadcastEvents} */
        const evt = {
          type: 'broadcastPostResourceUpdated',
          payload: {
            currentResource: ctx.currentResource,
            resource,
          },
        }
        return send(evt, { to: child })
      })
    }),
    pushToRoute: (ctx, evt) => {
      const search = z.string().parse(ctx.parent.state?.context?.history?.location?.search)
      const next = new URLSearchParams(search)

      if (!ctx.currentResource) return console.warn('pushToRoute - missing currentResource')

      const pathname = '/remoteResources/' + ctx.currentResource.id

      if (evt.type === 'set editor kind') {
        next.set('editorKind', evt.payload)
      } else if (evt.type === 'set current domain') {
        next.set('currentDomain', evt.payload)
      } else if (evt.type === 'clear current domain') {
        next.delete('currentDomain')
      } else if (evt.type === 'show original diff') {
        next.set('originalDiff', 'true')
      } else if (evt.type === 'close original diff') {
        next.delete('originalDiff')
      }

      ctx.parent.state.context.history.push({
        pathname,
        search: next.toString(),
      })
    },
    serviceError: pure((ctx, evt) => {
      const schema = z.string()
      const parsed = schema.parse(/** @type {any} */ (evt).data?.message)
      return [assign({ error: () => parsed }), raise({ type: 'error' })]
    }),
    clearErrors: pure(() => {
      return [assign({ error: () => null }), raise({ type: 'clearErrors' })]
    }),
  },
  guards: {
    'editor has valid content': (ctx) => {
      if (ctx.contentErrors && ctx.contentErrors?.length > 0) return false
      return true
    },
    hasOriginalDiffParam: (ctx) => {
      const parentState = ctx.parent?.state?.context
      const search = parentState.search
      return Boolean(search?.get('originalDiff'))
    },
  },
})

/**
 * @template {Promise<any>} T
 * @param {T} cb
 * @param {number} minTime
 * @return {Promise<T>}
 */
async function minDuration(cb, minTime = 500) {
  const [result] = await Promise.allSettled([cb, new Promise((resolve) => setTimeout(resolve, minTime))])
  if (result.status === 'fulfilled') return result.value
  if (result.status === 'rejected') throw new Error(result.reason)
  throw new Error('unreachable')
}

export const EditorKind = z.enum(['inline', 'diff', 'toggles', 'patches', 'trackers'])
export const CurrentResource = z.object({
  id: z.string(),
  lastValue: z.string(),
  editorKinds: z.array(EditorKind),
})
export const PrivacyConfig = z.object({
  unprotectedTemporary: z.array(z.any()),
  version: z.number().default(0),
  features: z.record(
    z.object({
      settings: z.record(z.any()).optional(),
      state: z.string(),
      exceptions: z.array(z.any()),
      hash: z.string().optional(),
    }),
  ),
})

export const AllowlistedTrackers = z.record(
  z.object({
    rules: z.array(
      z.object({
        rule: z.string(),
        domains: z.array(z.string()),
        reason: z.string().optional(),
      }),
    ),
  }),
)

/** @typedef {import("zod").infer<typeof EditorKind>} EditorKind */
/** @typedef {import("zod").infer<typeof CurrentResource>} CurrentResource */
/** @typedef {import("zod").infer<typeof PrivacyConfig>} PrivacyConfig */
/** @typedef {import("zod").infer<typeof AllowlistedTrackers>} AllowlistedTrackers */

/**
 * @param {unknown} input
 * @return {undefined|string}
 */
export function tryCreateDomain(input) {
  if (!input) return undefined
  if (typeof input !== 'string') return undefined
  const [prefix] = input.split('?')
  try {
    const subject = prefix.startsWith('http') ? prefix : 'https://' + prefix
    const parsed = new URL(subject)
    return parsed.hostname
  } catch (e) {
    console.warn('could not use url param for currentDomain', input)
    return undefined
  }
}
