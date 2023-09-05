import { assign, createMachine, pure, raise, send } from 'xstate'
import { remoteResourceSchema } from '../../../schema/__generated__/schema.parsers.mjs'
import * as z from 'zod'
import { DebugToolsMessages } from '../DebugToolsMessages.mjs'
import invariant from 'tiny-invariant'
import { updateFeatureHash } from '../transforms'
import jsonpatch from 'fast-json-patch'

/**
 * @typedef {import("./remote-resources.machine.types").RemoteResourcesBroadcastEvents} RemoteResourcesBroadcastEvents
 */

/** @type {Record<string, {editorKinds: EditorKind[]}>} */
const resourceCapabilities = {
  'privacy-configuration': {
    editorKinds: ['toggles', 'inline', 'diff', 'patches'],
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
  on: {
    REGISTER_CHILD: {
      actions: assign({
        children: (ctx, evt, meta) => {
          const child = meta._event.origin
          invariant(typeof child === 'string', 'tried to use meta._event.origin, but it wasnt a string')
          return (ctx.children || []).concat(child)
        },
      }),
    },
  },
  states: {
    'loading resource': {
      description: 'this will try to read from the incoming data',
      invoke: {
        src: 'loadResources',
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
            actions: ['assignError'],
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
        },
        {
          src: 'tab-listener',
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
            'RemoteResource.setRemoteUrl': {
              target: '.saving new remote',
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
                onDone: [
                  {
                    target: 'editor has original content',
                    actions: ['updateCurrentResource', 'clearErrors', 'raiseUpdated'],
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
                onDone: [
                  {
                    target: 'editor has original content',
                    actions: [
                      'broadcastPreUpdate',
                      'updateCurrentResource',
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

        const patches = jsonpatch.compare(original, nextJson)
        const nextConfig = await updateFeatureHash(patches, nextJson)
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
        const parentState = ctx.parent?.state?.context.history.location.pathname
        const id = parentState.split('/')[2] || 'privacy-configuration' // default
        const match = resources.find((x) => x.id === id)
        const matchingId = match ? match.id : resources[0].id

        if (!matchingId) throw new Error('unreachable - must have valid resource ID by this point')

        // matching, or default
        const capabilties = resourceCapabilities[matchingId] || resourceCapabilities.default

        return {
          id: matchingId,
          editorKinds: capabilties.editorKinds,
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
        assign({
          resourceKey: (ctx) => (ctx.resourceKey ?? 0) + 1,
        }),
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
        next.set('currentDomain', evt.payload) // setting the toggle kind
      } else if (evt.type === 'clear current domain') {
        next.delete('currentDomain')
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

export const EditorKind = z.enum(['inline', 'diff', 'toggles', 'patches'])
export const CurrentResource = z.object({
  id: z.string(),
  editorKinds: z.array(EditorKind),
})
export const PrivacyConfig = z.object({
  unprotectedTemporary: z.array(z.any()),
  features: z.record(
    z.object({
      settings: z.record(z.any()).optional(),
      state: z.string(),
      exceptions: z.array(z.any()),
      hash: z.string().optional(),
    }),
  ),
})
/** @typedef {import("zod").infer<typeof EditorKind>} EditorKind */
/** @typedef {import("zod").infer<typeof CurrentResource>} CurrentResource */
/** @typedef {import("zod").infer<typeof PrivacyConfig>} PrivacyConfig */

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
