import { assign, createMachine } from 'xstate'
import invariant from 'tiny-invariant'

export const trackerFeedMachine = createMachine(
  {
    id: 'trackerfeed',
    context: /** @type {import("./tracker-feed.types").TrackerFeedContext} */ ({}),
    schema: {
      events: /** @type {import('./tracker-feed.types').TrackerFeedEvents} */ ({}),
    },
    initial: 'idle',
    on: {
      broadcastCurrentDomain: [
        {
          actions: ['assignDomain'],
          target: 'subscribing',
          cond: 'will-set-domain',
        },
        {
          actions: ['assignDomain', 'clearSubscription'],
          target: 'waiting for domain selection',
        },
      ],
    },
    states: {
      idle: {
        always: [{ cond: 'has domain', target: 'subscribing' }, { target: 'waiting for domain selection' }],
      },
      'waiting for domain selection': {},
      subscribing: {
        on: {
          onTrackersUpdated: {
            actions: ['assignRequests'],
          },
          refresh: {
            target: 'subscribing',
          },
        },
        invoke: {
          id: 'tracker-feed',
          src: 'tracker-feed',
          onDone: [{ actions: 'clear' }],
        },
      },
    },
    predictableActionArguments: true,
    preserveActionOrder: true,
  },
  {
    services: {
      'tracker-feed': (ctx) => (send) => {
        invariant(ctx.domain, 'ctx.domain must be set before getting here')
        const unsub = ctx.messages.createTrackersSubscription({ domains: [ctx.domain] }, (data) => {
          send({ type: 'onTrackersUpdated', payload: data })
        })
        return () => {
          unsub()
        }
      },
    },
    guards: {
      'will-set-domain': (ctx, evt) => {
        invariant(evt.type === 'broadcastCurrentDomain', `evt.type === 'broadcastCurrentDomain'`)
        return typeof evt.payload.domain === 'string'
      },
      'has domain': (ctx) => {
        return typeof ctx.domain === 'string'
      },
    },
    actions: {
      clearSubscription: (ctx) => {
        ctx.messages.unsubscribeToTrackers()
      },
      assignDomain: assign({
        domain: (ctx, evt) => {
          invariant(evt.type === 'broadcastCurrentDomain', `evt.type === 'broadcastCurrentDomain'`)
          // this could be undefined, that's a valid situation (it means no domain was selected in the UI)
          return evt.payload.domain
        },
      }),
      clear: () => {
        console.log('CLEAR')
      },
      assignRequests: assign({
        requests: (ctx, evt) => {
          invariant(evt.type === 'onTrackersUpdated', `evt.type === 'onTrackersUpdated'`)
          return evt.payload.requests
        },
      }),
    },
  },
)
